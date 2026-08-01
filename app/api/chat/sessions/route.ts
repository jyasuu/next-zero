import { NextResponse } from "next/server"
import { isChatEnabled } from "@/features/chat/server/model"
import { requireSession } from "@/features/chat/server/auth"
import { createSession, listActiveSessions } from "@/features/chat/server/sessions"

export const dynamic = "force-dynamic"

export async function GET() {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  if (!isChatEnabled()) {
    return NextResponse.json({ error: "AI chat is disabled" }, { status: 503 })
  }
  return NextResponse.json(await listActiveSessions(guard.session.user.email ?? ""))
}

export async function POST() {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  if (!isChatEnabled()) {
    return NextResponse.json({ error: "AI chat is disabled" }, { status: 503 })
  }
  const created = await createSession(guard.session.user.email ?? "")
  return NextResponse.json(created)
}
