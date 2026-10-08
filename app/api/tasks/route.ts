import { env } from 'cloudflare:workers';

const setup = async () => {
  await env.DB.batch([
    env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, title TEXT NOT NULL, assignee TEXT, priority TEXT NOT NULL DEFAULT \'medium\', status TEXT NOT NULL DEFAULT \'todo\', due_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES projects(id))',
    ),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee)'),
  ]);
};

export async function GET(request: Request) {
  await setup();
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const query = projectId
    ? env.DB.prepare(
        'SELECT id, project_id AS projectId, title, assignee, priority, status, due_date AS dueDate, created_at AS createdAt FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      ).bind(projectId)
    : env.DB.prepare(
        'SELECT id, project_id AS projectId, title, assignee, priority, status, due_date AS dueDate, created_at AS createdAt FROM tasks ORDER BY created_at DESC',
      );
  const result = await query.all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  await setup();
  const body = (await request.json()) as {
    projectId?: number;
    title?: string;
    assignee?: string;
    priority?: string;
    dueDate?: string;
  };
  if (!body.projectId || !body.title?.trim()) {
    return Response.json({ error: 'Project and title are required' }, { status: 400 });
  }
  const result = await env.DB.prepare(
    'INSERT INTO tasks (project_id, title, assignee, priority, due_date) VALUES (?, ?, ?, ?, ?) RETURNING id, project_id AS projectId, title, assignee, priority, status, due_date AS dueDate, created_at AS createdAt',
  )
    .bind(body.projectId, body.title.trim(), body.assignee ?? null, body.priority ?? 'medium', body.dueDate ?? null)
    .first<{ id: number; projectId: number }>();

  // Recalculate project progress on adding new tasks
  if (result) {
    await updateProjectProgress(result.projectId);
  }

  return Response.json(result, { status: 201 });
}

export async function PATCH(request: Request) {
  await setup();
  const body = (await request.json()) as {
    id?: number;
    status?: string;
    title?: string;
    priority?: string;
    assignee?: string;
    dueDate?: string;
    projectId?: number;
  };
  if (!body.id) {
    return Response.json({ error: 'Task ID is required' }, { status: 400 });
  }

  const updates: string[] = [];
  const bindings: (string | number | null)[] = [];
  if (body.status !== undefined) {
    updates.push('status = ?');
    bindings.push(body.status);
  }
  if (body.title !== undefined) {
    updates.push('title = ?');
    bindings.push(body.title.trim());
  }
  if (body.priority !== undefined) {
    updates.push('priority = ?');
    bindings.push(body.priority);
  }
  if (body.assignee !== undefined) {
    updates.push('assignee = ?');
    bindings.push(body.assignee ? body.assignee.trim() : null);
  }
  if (body.dueDate !== undefined) {
    updates.push('due_date = ?');
    bindings.push(body.dueDate ?? null);
  }
  if (body.projectId !== undefined) {
    updates.push('project_id = ?');
    bindings.push(Number(body.projectId));
  }

  if (updates.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  bindings.push(body.id);
  const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? RETURNING id, project_id AS projectId, title, assignee, priority, status, due_date AS dueDate, created_at AS createdAt`;

  const result = await env.DB.prepare(sql).bind(...bindings).first<{ id: number; projectId: number }>();
  if (!result) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  // Recalculate progress for the associated project
  await updateProjectProgress(result.projectId);

  // If the task was moved to a different project, update the old project's progress too!
  if (body.projectId !== undefined && body.projectId !== result.projectId) {
    await updateProjectProgress(body.projectId);
  }

  return Response.json(result);
}

export async function DELETE(request: Request) {
  await setup();
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Task ID is required' }, { status: 400 });
  }

  const taskId = Number(id);

  // Find task to get its project ID
  const task = await env.DB.prepare('SELECT project_id AS projectId FROM tasks WHERE id = ?')
    .bind(taskId)
    .first<{ projectId: number }>();

  if (!task) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  // Delete the task
  await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();

  // Recalculate progress for the associated project
  await updateProjectProgress(task.projectId);

  return Response.json({ message: 'Task deleted successfully' });
}

// Helper to update project progress calculation in SQLite
async function updateProjectProgress(projectId: number) {
  const tasksCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE project_id = ?',
  ).first<{ count: number }>();
  
  if (tasksCount && tasksCount.count > 0) {
    const doneTasksCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND status = ?',
    )
      .bind(projectId, 'done')
      .first<{ count: number }>();

    const progress = Math.round(((doneTasksCount?.count || 0) / tasksCount.count) * 100);
    await env.DB.prepare('UPDATE projects SET progress = ? WHERE id = ?').bind(progress, projectId).run();
  } else {
    // No tasks = 0% progress
    await env.DB.prepare('UPDATE projects SET progress = 0 WHERE id = ?').bind(projectId).run();
  }
}
