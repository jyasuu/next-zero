import { NextResponse } from "next/server"
import type { UIMessage } from "ai"
import { auth } from "@/lib/auth"
import { isChatEnabled } from "@/features/chat/server/model"
import { streamChatResponse } from "@/features/chat/server/chat"
import { getCustomPrompt } from "@/features/chat/server/settings"
import { getRoleWithPolicies } from "@/lib/roles"
import { listGrantedActions } from "@/features/chat/lib/prompts"
import type { SerializedChatTool } from "@/features/chat/types"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
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
    { email: session.user.email ?? "", roleName, isAdmin, granted, customPrompt },
    messages as UIMessage[],
    tools as SerializedChatTool[]
  )
}
