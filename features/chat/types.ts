import { z } from "zod"

export type ToolApprovalPolicy = "always" | "auto"

export type ToolExecutionResult =
  | { ok: true; data?: unknown }
  | { ok: false; error: string }

export interface ChatTool {
  id: string
  name: string
  description: string
  inputSchema: z.ZodTypeAny
  approval: ToolApprovalPolicy
  execute: (args: unknown) => ToolExecutionResult | Promise<ToolExecutionResult>
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface SerializedChatTool {
  id: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  approval: ToolApprovalPolicy
}

export const whoamiOutputSchema = z.object({
  email: z.string(),
  role: z.string(),
  isAdmin: z.boolean(),
})

export const userRowOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  created_at: z.string(),
})

export const usersListOutputSchema = z.array(userRowOutputSchema)
export const deletedOutputSchema = z.object({ success: z.literal(true) })

export type UserRow = z.infer<typeof userRowOutputSchema>
export type WhoAmIOutput = z.infer<typeof whoamiOutputSchema>

export type KnownToolOutput =
  | { tool: "account_whoami"; output: WhoAmIOutput }
  | { tool: "users_list"; output: z.infer<typeof usersListOutputSchema> }
  | { tool: "users_get"; output: UserRow }
  | { tool: "users_create"; output: UserRow }
  | { tool: "users_update"; output: UserRow }
  | { tool: "users_delete"; output: z.infer<typeof deletedOutputSchema> }

export type ToolId = KnownToolOutput["tool"]
