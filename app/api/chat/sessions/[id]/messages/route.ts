import { NextResponse } from "next/server"
import type { ChatMessageLike } from "@/features/chat/lib/sessions"
import { auth } from "@/lib/auth"
import { loadSessionMessages, replaceSessionMessages } from "@/features/chat/server/sessions"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const messages = await loadSessionMessages(session.user.email ?? "", id)
  if (!messages) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(messages)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  if (!body?.messages) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
  const { id } = await params
  const updated = await replaceSessionMessages(
    session.user.email ?? "",
    id,
    body.messages as ChatMessageLike[]
  )
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(updated)
}
