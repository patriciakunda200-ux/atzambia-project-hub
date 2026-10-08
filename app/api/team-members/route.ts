import { env } from 'cloudflare:workers';

const setup = async () => {
  // Create table
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS team_members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 100)',
  ).run();

  // Check if empty, then seed default team members
  const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM team_members').first<{ count: number }>();
  if (countResult && countResult.count === 0) {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO team_members (name, email, role, capacity) VALUES ('Jonathan K.', 'jonathan@avensus.com', 'Administrator', 100)",
      ),
      env.DB.prepare(
        "INSERT INTO team_members (name, email, role, capacity) VALUES ('Mangaliso M.', 'mangaliso@avensus.com', 'Senior Developer', 80)",
      ),
      env.DB.prepare(
        "INSERT INTO team_members (name, email, role, capacity) VALUES ('Chanda N.', 'chanda@avensus.com', 'UI/UX Designer', 90)",
      ),
      env.DB.prepare(
        "INSERT INTO team_members (name, email, role, capacity) VALUES ('Brian T.', 'brian@avensus.com', 'QA Engineer', 50)",
      ),
    ]);
  }
};

export async function GET() {
  await setup();
  const result = await env.DB.prepare('SELECT * FROM team_members ORDER BY name ASC').all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  await setup();
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    role?: string;
    capacity?: number;
  };

  if (!body.name?.trim() || !body.email?.trim() || !body.role?.trim()) {
    return Response.json({ error: 'Name, email, and role are required' }, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(
      'INSERT INTO team_members (name, email, role, capacity) VALUES (?, ?, ?, ?) RETURNING *',
    )
      .bind(body.name.trim(), body.email.trim().toLowerCase(), body.role.trim(), body.capacity ?? 100)
      .first();
    return Response.json(result, { status: 201 });
  } catch (err) {
    const error = err as { message?: string };
    if (error.message?.includes('UNIQUE')) {
      return Response.json({ error: 'A team member with this email already exists' }, { status: 400 });
    }
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await setup();
  const body = (await request.json()) as {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
    capacity?: number;
  };

  if (!body.id) {
    return Response.json({ error: 'Team member ID is required' }, { status: 400 });
  }

  const updates: string[] = [];
  const bindings: (string | number)[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    bindings.push(body.name.trim());
  }
  if (body.email !== undefined) {
    updates.push('email = ?');
    bindings.push(body.email.trim().toLowerCase());
  }
  if (body.role !== undefined) {
    updates.push('role = ?');
    bindings.push(body.role.trim());
  }
  if (body.capacity !== undefined) {
    updates.push('capacity = ?');
    bindings.push(Number(body.capacity));
  }

  if (updates.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  bindings.push(body.id);
  const sql = `UPDATE team_members SET ${updates.join(', ')} WHERE id = ? RETURNING *`;

  try {
    const result = await env.DB.prepare(sql).bind(...bindings).first();
    if (!result) {
      return Response.json({ error: 'Team member not found' }, { status: 404 });
    }
    return Response.json(result);
  } catch (err) {
    const error = err as { message?: string };
    if (error.message?.includes('UNIQUE')) {
      return Response.json({ error: 'A team member with this email already exists' }, { status: 400 });
    }
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await setup();
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Team member ID is required' }, { status: 400 });
  }

  try {
    // Check if team member exists
    const member = await env.DB.prepare('SELECT name FROM team_members WHERE id = ?').bind(Number(id)).first();
    if (!member) {
      return Response.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Set task assignees to NULL or default if they were assigned to this team member
    // To do this, we compute their initials since they are used in tasks
    const nameStr = member.name as string;
    const initials = nameStr
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    await env.DB.batch([
      env.DB.prepare('UPDATE tasks SET assignee = NULL WHERE assignee = ?').bind(initials),
      env.DB.prepare('DELETE FROM team_members WHERE id = ?').bind(Number(id)),
    ]);

    return Response.json({ message: 'Team member removed successfully' });
  } catch (err) {
    const error = err as { message?: string };
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
