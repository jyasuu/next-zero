import type { ChatSession } from "@/features/chat/types"

export interface ChatSessionRow {
  id: string
  user_email: string | null
  title: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ChatMessageLike {
  id?: string
  role: string
  parts: Array<{ type: string; text?: string }>
}

export function filterActiveSessions(rows: ChatSessionRow[]): ChatSession[] {
  return rows
    .filter((row) => row.deleted_at === null)
    .map((row) => ({
      id: row.id,
      title: row.title ?? "",
      createdAt: row.created_at ?? "",
      updatedAt: row.updated_at ?? "",
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
}

export function sessionOwnedBy(row: ChatSessionRow, email: string): boolean {
  return row.user_email === email
}

const TITLE_MAX_LENGTH = 60

export function seedTitleFromMessages(messages: ChatMessageLike[]): string | null {
  for (const message of messages) {
    if (message.role !== "user") continue
    const text = message.parts.find((part) => part.type === "text" && part.text)?.text
    if (text) {
      return text.length > TITLE_MAX_LENGTH
        ? `${text.slice(0, TITLE_MAX_LENGTH - 1)}…`
        : text
    }
  }
  return null
}

export function serializeParts(parts: unknown): string {
  return JSON.stringify(parts)
}

export function deserializeParts(json: string): unknown[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
