import { NextResponse } from "next/server"
import type { ChatMessageLike } from "@/features/chat/lib/sessions"
import { requireSession } from "@/features/chat/server/auth"
import { loadSessionMessages, saveSessionMessages } from "@/features/chat/server/sessions"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const { id } = await params
  const messages = await loadSessionMessages(guard.session.user.email ?? "", id)
  if (!messages) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(messages)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const body = await request.json().catch(() => null)
  if (!body?.messages) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
  const { id } = await params
  const updated = await saveSessionMessages(
    guard.session.user.email ?? "",
    id,
    body.messages as ChatMessageLike[]
  )
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(updated)
}
