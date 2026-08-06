import { z } from "zod"
import type { ChatTool } from "@/features/chat/types"
import { fetchJson } from "@/features/chat/tools/fetch-json"
import type { ExpenseRow } from "@/features/expenses/lib/visibility"

export const expensesTools: ChatTool[] = [
  {
    id: "expenses_create",
    name: "File expense claim",
    description: "Files an expense claim that a manager must approve.",
    inputSchema: z.object({
      title: z.string().trim().min(1, "title is required"),
      amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "amount is invalid"),
      justification: z.string().trim().min(1, "justification is required"),
    }),
    approval: "always",
    execute: async (args) => {
      const { title, amount, justification } = args as {
        title: string
        amount: string
        justification: string
      }
      return fetchJson<ExpenseRow>("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ title, amount, justification }),
      })
    },
  },
  {
    id: "expenses_list",
    name: "List expense claims",
    description: "Lists the expense claims visible to the caller.",
    inputSchema: z.object({}),
    approval: "auto",
    execute: async () => fetchJson<ExpenseRow[]>("/api/expenses"),
  },
]
