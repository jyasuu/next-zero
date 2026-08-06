"use client"

import type { ReactNode } from "react"
import { ChatToolScope } from "@/features/chat/components/chat-scope"
import { requestsTools } from "@/features/requests/tools"

export function RequestsChatScope({ children }: { children: ReactNode }) {
  return <ChatToolScope tools={requestsTools}>{children}</ChatToolScope>
}
