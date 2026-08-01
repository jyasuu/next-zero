import { getDb, queryAll, queryRow, save } from "@/lib/db"
import {
  filterActiveSessions,
  seedTitleFromMessages,
  serializeParts,
  type ChatMessageLike,
  type ChatSessionRow,
} from "@/features/chat/lib/sessions"
import type { ChatSession } from "@/features/chat/types"

function nowIso(): string {
  return new Date().toISOString()
}

function mapRow(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
    title: row.title ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  }
}

export async function listActiveSessions(email: string): Promise<ChatSession[]> {
  const db = await getDb()
  const rows = queryAll(
    db,
    "SELECT id, user_email, title, created_at, updated_at, deleted_at FROM chat_sessions WHERE user_email = ? ORDER BY updated_at DESC",
    [email]
  )
  return filterActiveSessions(rows as unknown as ChatSessionRow[])
}

export async function createSession(email: string): Promise<ChatSession> {
  const db = await getDb()
  const id = crypto.randomUUID()
  const now = nowIso()
  db.run(
    "INSERT INTO chat_sessions (id, user_email, title, created_at, updated_at, deleted_at) VALUES (?, ?, '', ?, ?, NULL)",
    [id, email, now, now]
  )
  save(db)
  return mapRow({ id, user_email: email, title: "", created_at: now, updated_at: now, deleted_at: null })
}

export async function getOwnedSession(
  email: string,
  id: string
): Promise<ChatSessionRow | null> {
  const db = await getDb()
  const row = queryRow(db, "SELECT * FROM chat_sessions WHERE id = ?", [id])
  if (!row) return null
  const session = row as unknown as ChatSessionRow
  if (session.deleted_at !== null || session.user_email !== email) return null
  return session
}

export async function softDeleteSession(email: string, id: string): Promise<boolean> {
  const db = await getDb()
  db.run(
    "UPDATE chat_sessions SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_email = ? AND deleted_at IS NULL",
    [nowIso(), nowIso(), id, email]
  )
  const deleted = db.getRowsModified() > 0
  save(db)
  return deleted
}

export async function replaceSessionMessages(
  email: string,
  id: string,
  messages: ChatMessageLike[]
): Promise<ChatSession | null> {
  const session = await getOwnedSession(email, id)
  if (!session) return null

  const db = await getDb()
  const now = nowIso()

  const title = seedTitleFromMessages(messages)
  if (title && !session.title) {
    db.run("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?", [title, now, id])
  } else {
    db.run("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", [now, id])
  }

  db.run("DELETE FROM chat_messages WHERE session_id = ?", [id])
  for (const message of messages) {
    db.run(
      "INSERT INTO chat_messages (id, session_id, role, parts_json, created_at) VALUES (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), id, message.role, serializeParts(message.parts), now]
    )
  }
  save(db)

  return mapRow({
    ...session,
    title: title ?? session.title ?? "",
    updated_at: now,
  })
}

export async function loadSessionMessages(
  email: string,
  id: string
): Promise<ChatMessageLike[] | null> {
  const session = await getOwnedSession(email, id)
  if (!session) return null
  const db = await getDb()
  const rows = queryAll(db, "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC", [id])
  return rows.map((row) => ({
    role: row.role as string,
    id: row.id as string,
    parts: JSON.parse((row.parts_json as string) ?? "[]"),
  }))
}
