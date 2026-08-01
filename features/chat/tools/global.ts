import { z } from "zod"
import { useChatStore } from "@/stores/chat-store"
import type { ChatTool } from "@/features/chat/types"

const whoamiSchema = z.object({})

export const globalTools: ChatTool[] = [
  {
    id: "account_whoami",
    name: "Who am I",
    description:
      "Reports the signed-in user's identity, role, and whether they are an administrator. Use this to answer questions about the caller's own access.",
    inputSchema: whoamiSchema,
    approval: "auto",
    execute: () => {
      const { claims } = useChatStore.getState()
      if (!claims?.email) {
        return { ok: false, error: "The caller's identity is unavailable." }
      }
      return {
        ok: true,
        data: { email: claims.email, role: claims.role, isAdmin: claims.isAdmin },
      }
    },
  },
]
