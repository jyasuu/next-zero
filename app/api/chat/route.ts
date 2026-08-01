import { NextResponse } from "next/server"
import type { UIMessage } from "ai"
import { isChatEnabled } from "@/features/chat/server/model"
import { streamChatResponse } from "@/features/chat/server/chat"
import { requireSession } from "@/features/chat/server/auth"
import { getCustomPrompt } from "@/features/chat/server/settings"
import { getRoleWithPolicies } from "@/lib/roles"
import { listGrantedActions } from "@/features/chat/lib/prompts"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const session = guard.session
  if (!isChatEnabled()) {
    return NextResponse.json({ error: "AI chat is disabled" }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
  const { messages = [], tools = [] } = body

  const isAdmin = session.user.isAdmin ?? false
  const roleName = session.user.role ?? ""
  const role = await getRoleWithPolicies(roleName)
  const granted = listGrantedActions(role ?? { permissions: [] }, isAdmin)
  const customPrompt = await getCustomPrompt(session.user.email ?? "")

  return streamChatResponse(
    { email: session.user.email ?? "", roleName, isAdmin, granted, customPrompt, tools },
    messages as UIMessage[]
  )
}
