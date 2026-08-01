"use client"

import type { ReactNode } from "react"
import { ChatToolScope } from "@/features/chat/components/chat-scope"
import { usersTools } from "@/features/chat/tools/users"

export function UsersChatScope({ children }: { children: ReactNode }) {
  return <ChatToolScope tools={usersTools}>{children}</ChatToolScope>
}
