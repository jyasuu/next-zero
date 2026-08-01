"use client"

import { useEffect, useId, type ReactNode } from "react"
import { useChatProvider } from "@/features/chat/components/chat-provider"
import type { ChatTool } from "@/features/chat/types"

interface ChatToolScopeProps {
  tools: ChatTool[]
  children: ReactNode
}

export function ChatToolScope({ tools, children }: ChatToolScopeProps) {
  const { registerScope, unregisterScope } = useChatProvider()
  const id = useId()

  useEffect(() => {
    registerScope({ id, tools })
    return () => unregisterScope(id)
  }, [id, tools, registerScope, unregisterScope])

  return <>{children}</>
}
