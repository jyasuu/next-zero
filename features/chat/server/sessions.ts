import { queryAll, queryRow, run } from "@/lib/db"
import {
  filterActiveSessions,
  rowToSession,
  seedTitleFromMessages,
  firstUserTextFromMessages,
  serializeParts,
  sessionOwnedBy,
  type ChatMessageLike,
  type ChatSessionRow,
} from "@/features/chat/lib/sessions"
import { generateSessionTitle } from "@/features/chat/server/title"
import type { ChatSession } from "@/features/chat/types"

function nowIso(): string {
  return new Date().toISOString()
}

export async function listActiveSessions(email: string): Promise<ChatSession[]> {
  const rows = await queryAll(
    "SELECT id, user_email, title, created_at, updated_at, deleted_at FROM chat_sessions WHERE user_email = $1 ORDER BY updated_at DESC",
    [email]
  )
  return filterActiveSessions(rows as unknown as ChatSessionRow[])
}

export async function createSession(email: string): Promise<ChatSession> {
  const id = crypto.randomUUID()
  const now = nowIso()
  await run(
    "INSERT INTO chat_sessions (id, user_email, title, created_at, updated_at, deleted_at) VALUES ($1, $2, '', $3, $4, NULL)",
    [id, email, now, now]
  )
  return rowToSession({ id, user_email: email, title: "", created_at: now, updated_at: now, deleted_at: null })
}

export async function getOwnedSession(
  email: string,
  id: string
): Promise<ChatSessionRow | null> {
  const row = await queryRow("SELECT * FROM chat_sessions WHERE id = $1", [id])
  if (!row) return null
  const session = row as unknown as ChatSessionRow
  if (session.deleted_at !== null || !sessionOwnedBy(session, email)) return null
  return session
}

export async function softDeleteSession(email: string, id: string): Promise<boolean> {
  const result = await run(
    "UPDATE chat_sessions SET deleted_at = $1, updated_at = $2 WHERE id = $3 AND user_email = $4 AND deleted_at IS NULL",
    [nowIso(), nowIso(), id, email]
  )
  return result.rowCount > 0
}

export async function saveSessionMessages(
  email: string,
  id: string,
  messages: ChatMessageLike[]
): Promise<ChatSession | null> {
  const session = await getOwnedSession(email, id)
  if (!session) return null

  const now = nowIso()

  const existingTitle = session.title ?? ""
  let title = existingTitle
  if (!existingTitle) {
    const firstUserText = firstUserTextFromMessages(messages)
    if (firstUserText) {
      const generated = await generateSessionTitle(firstUserText)
      title = generated ?? seedTitleFromMessages(messages) ?? ""
    }
  }

  if (title && !existingTitle) {
    await run("UPDATE chat_sessions SET title = $1, updated_at = $2 WHERE id = $3", [title, now, id])
  } else {
    await run("UPDATE chat_sessions SET updated_at = $1 WHERE id = $2", [now, id])
  }

  for (const message of messages) {
    await run(
      `INSERT INTO chat_messages (id, session_id, role, parts_json, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET session_id = EXCLUDED.session_id, role = EXCLUDED.role, parts_json = EXCLUDED.parts_json`,
      [message.id ?? crypto.randomUUID(), id, message.role, serializeParts(message.parts), now]
    )
  }

  return rowToSession({
    ...session,
    title,
    updated_at: now,
  })
}

export async function loadSessionMessages(
  email: string,
  id: string
): Promise<ChatMessageLike[] | null> {
  const session = await getOwnedSession(email, id)
  if (!session) return null
  const rows = await queryAll(
    "SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
    [id]
  )
  return rows.map((row) => ({
    role: row.role as string,
    id: row.id as string,
    parts: JSON.parse((row.parts_json as string) ?? "[]"),
  }))
}
