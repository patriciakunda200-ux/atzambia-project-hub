import { env } from 'cloudflare:workers';

const setup = async () => {
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL DEFAULT "assignment", read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  ).run();

  const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM notifications').first<{ count: number }>();
  if (countResult && countResult.count === 0) {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO notifications (user_email, title, message, type, read) VALUES ('jonathan@avensus.com', 'New Project Launched', 'Avensus Fleet Manager v2 project has been initialized in your workspace.', 'system', 0)"
      ),
      env.DB.prepare(
        "INSERT INTO notifications (user_email, title, message, type, read) VALUES ('mangaliso@avensus.com', 'Task Assigned', 'You were assigned to REST API Endpoint Integration by Jonathan K.', 'assignment', 0)"
      ),
      env.DB.prepare(
        "INSERT INTO notifications (user_email, title, message, type, read) VALUES ('chanda@avensus.com', 'Design Review Requested', 'UI Mockups for Broadleaf Mobile App have been moved to In Review.', 'status', 0)"
      ),
    ]);
  }
};

export async function GET(request: Request) {
  await setup();
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  let sql = 'SELECT * FROM notifications ORDER BY id DESC LIMIT 50';
  let bindings: string[] = [];

  if (email) {
    sql = 'SELECT * FROM notifications WHERE user_email = ? OR user_email = "all" ORDER BY id DESC LIMIT 50';
    bindings = [email.toLowerCase()];
  }

  const result = await env.DB.prepare(sql).bind(...bindings).all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  await setup();
  const body = (await request.json()) as {
    userEmail?: string;
    title?: string;
    message?: string;
    type?: string;
    webhookUrl?: string;
  };

  if (!body.title?.trim() || !messageValid(body.message)) {
    return Response.json({ error: 'Title and message are required' }, { status: 400 });
  }

  const targetEmail = (body.userEmail || 'all').toLowerCase();
  const notifType = body.type || 'assignment';

  const result = await env.DB.prepare(
    'INSERT INTO notifications (user_email, title, message, type, read) VALUES (?, ?, ?, ?, 0) RETURNING *'
  )
    .bind(targetEmail, body.title.trim(), body.message!.trim(), notifType)
    .first();

  if (body.webhookUrl?.startsWith('http')) {
    fetch(body.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🔔 *${body.title}*\n${body.message}\n_Avensus Project Hub Notification_`,
      }),
    }).catch((err: unknown) => console.error('Webhook dispatch error:', err));
  }

  return Response.json(result, { status: 201 });
}

function messageValid(msg?: string): boolean {
  return Boolean(msg && msg.trim().length > 0);
}

export async function PATCH(request: Request) {
  await setup();
  const body = (await request.json()) as { id?: number; markAllRead?: boolean; userEmail?: string };

  if (body.markAllRead && body.userEmail) {
    await env.DB.prepare('UPDATE notifications SET read = 1 WHERE user_email = ? OR user_email = "all"')
      .bind(body.userEmail.toLowerCase())
      .run();
    return Response.json({ message: 'All notifications marked as read' });
  }

  if (body.id) {
    const updated = await env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? RETURNING *')
      .bind(body.id)
      .first();
    return Response.json(updated);
  }

  return Response.json({ error: 'Notification ID or markAllRead is required' }, { status: 400 });
}

export async function DELETE(request: Request) {
  await setup();
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    await env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(Number(id)).run();
    return Response.json({ message: 'Notification deleted' });
  }

  return Response.json({ error: 'Notification ID required' }, { status: 400 });
}
