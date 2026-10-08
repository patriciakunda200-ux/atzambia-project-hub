import { env } from 'cloudflare:workers';

const setup = async () => {
  await env.DB.batch([
    env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, client TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'active\', progress INTEGER NOT NULL DEFAULT 0, due_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    ),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)'),
  ]);
};

export async function GET() {
  await setup();
  const result = await env.DB.prepare(
    'SELECT id, name, client, status, progress, due_date AS dueDate, created_at AS createdAt FROM projects ORDER BY created_at DESC',
  ).all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  await setup();
  const body = (await request.json()) as { name?: string; client?: string; dueDate?: string };
  if (!body.name?.trim() || !body.client?.trim()) {
    return Response.json({ error: 'Name and client are required' }, { status: 400 });
  }
  const result = await env.DB.prepare(
    'INSERT INTO projects (name, client, due_date) VALUES (?, ?, ?) RETURNING id, name, client, status, progress, due_date AS dueDate',
  )
    .bind(body.name.trim(), body.client.trim(), body.dueDate ?? null)
    .first();
  return Response.json(result, { status: 201 });
}

export async function PATCH(request: Request) {
  await setup();
  const body = (await request.json()) as {
    id?: number;
    status?: string;
    progress?: number;
    name?: string;
    client?: string;
    dueDate?: string;
  };
  if (!body.id) {
    return Response.json({ error: 'Project ID is required' }, { status: 400 });
  }

  const updates: string[] = [];
  const bindings: (string | number | null)[] = [];
  if (body.status !== undefined) {
    updates.push('status = ?');
    bindings.push(body.status);
  }
  if (body.progress !== undefined) {
    updates.push('progress = ?');
    bindings.push(body.progress);
  }
  if (body.name !== undefined) {
    updates.push('name = ?');
    bindings.push(body.name.trim());
  }
  if (body.client !== undefined) {
    updates.push('client = ?');
    bindings.push(body.client.trim());
  }
  if (body.dueDate !== undefined) {
    updates.push('due_date = ?');
    bindings.push(body.dueDate ?? null);
  }

  if (updates.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  bindings.push(body.id);
  const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ? RETURNING id, name, client, status, progress, due_date AS dueDate`;

  const result = await env.DB.prepare(sql).bind(...bindings).first();
  if (!result) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  return Response.json(result);
}

export async function DELETE(request: Request) {
  await setup();
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Project ID is required' }, { status: 400 });
  }

  const projectId = Number(id);

  // Check if project exists
  const project = await env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first();
  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  // Delete project and cascading associated tasks
  await env.DB.batch([
    env.DB.prepare('DELETE FROM tasks WHERE project_id = ?').bind(projectId),
    env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId),
  ]);

  return Response.json({ message: 'Project and associated tasks deleted successfully' });
}
