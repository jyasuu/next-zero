import { z } from "zod"
import type { ChatTool } from "@/features/chat/types"
import { fetchJson } from "@/features/chat/tools/fetch-json"
import type { RequestRow } from "@/features/requests/lib/visibility"

export const requestsTools: ChatTool[] = [
  {
    id: "requests_create",
    name: "File access request",
    description: "Files an access request that a manager must approve.",
    inputSchema: z.object({
      title: z.string().trim().min(1, "title is required"),
      access: z.string().trim().min(1, "access is required"),
      justification: z.string().trim().min(1, "justification is required"),
    }),
    approval: "always",
    execute: async (args) => {
      const { title, access, justification } = args as {
        title: string
        access: string
        justification: string
      }
      return fetchJson<RequestRow>("/api/requests", {
        method: "POST",
        body: JSON.stringify({ title, access, justification }),
      })
    },
  },
  {
    id: "requests_list",
    name: "List access requests",
    description: "Lists the access requests visible to the caller.",
    inputSchema: z.object({}),
    approval: "auto",
    execute: async () => fetchJson<RequestRow[]>("/api/requests"),
  },
]
