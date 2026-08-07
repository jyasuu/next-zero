import { z } from "zod"
import type { ChatTool } from "@/features/chat/types"
import { fetchJson } from "@/features/chat/tools/fetch-json"
import { createFormFillTool } from "@/features/chat/tools/form-fill"
import { useRequestsStore } from "@/features/requests/store"
import { requestFormSchema } from "@/features/requests/lib/form"
import type { RequestRow } from "@/features/requests/lib/visibility"

export const requestsFormFillTool = createFormFillTool({
  id: "requests_form_fill",
  name: "Fill request form",
  description:
    "Fills the access-request form with proposed values and returns the validation result without submitting. Fields: title (text), access (text), justification (text).",
  schema: requestFormSchema,
})

export const requestsTools: ChatTool[] = [
  requestsFormFillTool,
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
      const result = await fetchJson<RequestRow>("/api/requests", {
        method: "POST",
        body: JSON.stringify({ title, access, justification }),
      })
      if (result.ok) useRequestsStore.getState().upsert(result.data)
      return result
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
