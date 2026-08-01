import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isChatEnabled } from "@/features/chat/server/model"
import { createSession, listActiveSessions } from "@/features/chat/server/sessions"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!isChatEnabled()) {
    return NextResponse.json({ error: "AI chat is disabled" }, { status: 503 })
  }
  return NextResponse.json(await listActiveSessions(session.user.email ?? ""))
}

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!isChatEnabled()) {
    return NextResponse.json({ error: "AI chat is disabled" }, { status: 503 })
  }
  const created = await createSession(session.user.email ?? "")
  return NextResponse.json(created)
}
