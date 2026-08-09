"use client"

import type { ReactNode } from "react"
import { ChatToolScope } from "@/features/chat/components/chat-scope"
import { skillsTools } from "@/features/skills/tools"

export function SkillsChatScope({ children }: { children: ReactNode }) {
  return <ChatToolScope tools={skillsTools}>{children}</ChatToolScope>
}
