"use client"

import type { ReactNode } from "react"
import { ChatToolScope } from "@/features/chat/components/chat-scope"
import { expensesTools } from "@/features/expenses/tools"

export function ExpensesChatScope({ children }: { children: ReactNode }) {
  return <ChatToolScope tools={expensesTools}>{children}</ChatToolScope>
}
