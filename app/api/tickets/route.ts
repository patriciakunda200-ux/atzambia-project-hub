import { env } from 'cloudflare:workers';

const setup = async () => {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      ticket_number TEXT NOT NULL, 
      title TEXT NOT NULL, 
      description TEXT NOT NULL, 
      category TEXT NOT NULL, 
      priority TEXT NOT NULL DEFAULT 'medium', 
      status TEXT NOT NULL DEFAULT 'open', 
      assignee TEXT NOT NULL, 
      created_by TEXT NOT NULL, 
      project_id INTEGER, 
      due_date TEXT, 
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM tickets').first<{ count: number }>();
  if (countResult && countResult.count === 0) {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO tickets (ticket_number, title, description, category, priority, status, assignee, created_by, due_date) 
         VALUES ('WO-1001', 'Primary Core Switch Firmware Upgrade', 'Perform emergency firmware update and VLAN routing audit on main server room switch rack.', 'Infrastructure', 'high', 'in_progress', 'Mangaliso M.', 'Jonathan K.', '2026-09-28')`
      ),
      env.DB.prepare(
        `INSERT INTO tickets (ticket_number, title, description, category, priority, status, assignee, created_by, due_date) 
         VALUES ('WO-1002', 'Client VPN Gateway Certificate Renewal', 'Renew SSL/TLS certificate chain for secure remote access portal and re-issue client profiles.', 'Network', 'urgent', 'open', 'Chanda B.', 'Jonathan K.', '2026-09-25')`
      ),
      env.DB.prepare(
        `INSERT INTO tickets (ticket_number, title, description, category, priority, status, assignee, created_by, due_date) 
         VALUES ('WO-1003', 'Database Backup Automation Verification', 'Audit daily Cloudflare D1 snapshot cron triggers and test point-in-time recovery procedure.', 'Database', 'medium', 'resolved', 'Akende M.', 'Jonathan K.', '2026-09-20')`
      ),
    ]);
  }
};

export async function GET(request: Request) {
  await setup();
  const url = new URL(request.url);
  const assignee = url.searchParams.get('assignee');
  const status = url.searchParams.get('status');

  let sql = 'SELECT * FROM tickets ORDER BY id DESC';
  const bindings: (string | number)[] = [];

  if (assignee || status) {
    const conditions: string[] = [];
    if (assignee) {
      conditions.push('(LOWER(assignee) = ? OR LOWER(assignee) = ?)');
      bindings.push(assignee.toLowerCase(), assignee.split('@')[0].toLowerCase());
    }
    if (status && status !== 'all') {
      conditions.push('status = ?');
      bindings.push(status);
    }
    sql = `SELECT * FROM tickets WHERE ${conditions.join(' AND ')} ORDER BY id DESC`;
  }

  const result = await env.DB.prepare(sql).bind(...bindings).all();
  
  // Format snake_case to camelCase for frontend
  const formatted = (result.results || []).map((t: Record<string, unknown>) => ({
    id: t.id,
    ticketNumber: t.ticket_number,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    assignee: t.assignee,
    createdBy: t.created_by,
    projectId: t.project_id || null,
    dueDate: t.due_date || null,
    createdAt: t.created_at,
  }));

  return Response.json(formatted);
}

export async function POST(request: Request) {
  await setup();
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    assignee?: string;
    createdBy?: string;
    projectId?: number;
    dueDate?: string;
  };

  if (!body.title?.trim() || !body.description?.trim() || !body.assignee?.trim()) {
    return Response.json({ error: 'Title, description, and assignee are required' }, { status: 400 });
  }

  // Generate unique Ticket Work Order Number
  const countRow = await env.DB.prepare('SELECT COUNT(*) as total FROM tickets').first<{ total: number }>();
  const nextNum = (countRow?.total || 0) + 1001;
  const ticketNumber = `WO-${nextNum}`;

  const category = body.category || 'General';
  const priority = body.priority || 'medium';
  const createdBy = body.createdBy || 'System';

  const inserted = await env.DB.prepare(
    `INSERT INTO tickets (ticket_number, title, description, category, priority, status, assignee, created_by, project_id, due_date)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?) RETURNING *`
  )
    .bind(
      ticketNumber,
      body.title.trim(),
      body.description.trim(),
      category,
      priority,
      body.assignee.trim(),
      createdBy,
      body.projectId || null,
      body.dueDate || null
    )
    .first();

  if (!inserted) {
    return Response.json({ error: 'Failed to create work order ticket' }, { status: 500 });
  }

  const formatted = {
    id: inserted.id,
    ticketNumber: inserted.ticket_number,
    title: inserted.title,
    description: inserted.description,
    category: inserted.category,
    priority: inserted.priority,
    status: inserted.status,
    assignee: inserted.assignee,
    createdBy: inserted.created_by,
    projectId: inserted.project_id || null,
    dueDate: inserted.due_date || null,
    createdAt: inserted.created_at,
  };

  return Response.json(formatted, { status: 201 });
}

export async function PATCH(request: Request) {
  await setup();
  const body = (await request.json()) as {
    id?: number;
    status?: string;
    assignee?: string;
    priority?: string;
    title?: string;
    description?: string;
  };

  if (!body.id) {
    return Response.json({ error: 'Ticket ID is required' }, { status: 400 });
  }

  const fields: string[] = [];
  const bindings: (string | number)[] = [];

  if (body.status) {
    fields.push('status = ?');
    bindings.push(body.status);
  }
  if (body.assignee) {
    fields.push('assignee = ?');
    bindings.push(body.assignee);
  }
  if (body.priority) {
    fields.push('priority = ?');
    bindings.push(body.priority);
  }
  if (body.title) {
    fields.push('title = ?');
    bindings.push(body.title.trim());
  }
  if (body.description) {
    fields.push('description = ?');
    bindings.push(body.description.trim());
  }

  if (fields.length === 0) {
    return Response.json({ error: 'No fields provided for update' }, { status: 400 });
  }

  bindings.push(body.id);
  const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = ? RETURNING *`;
  const updated = await env.DB.prepare(sql).bind(...bindings).first();

  if (!updated) {
    return Response.json({ error: 'Work order ticket not found' }, { status: 404 });
  }

  const formatted = {
    id: updated.id,
    ticketNumber: updated.ticket_number,
    title: updated.title,
    description: updated.description,
    category: updated.category,
    priority: updated.priority,
    status: updated.status,
    assignee: updated.assignee,
    createdBy: updated.created_by,
    projectId: updated.project_id || null,
    dueDate: updated.due_date || null,
    createdAt: updated.created_at,
  };

  return Response.json(formatted);
}

export async function DELETE(request: Request) {
  await setup();
  const url = new URL(request.url);
  const idStr = url.searchParams.get('id');

  if (!idStr) {
    return Response.json({ error: 'Ticket ID is required' }, { status: 400 });
  }

  const id = parseInt(idStr, 10);
  await env.DB.prepare('DELETE FROM tickets WHERE id = ?').bind(id).run();

  return Response.json({ success: true, message: 'Work order ticket deleted successfully' });
}
