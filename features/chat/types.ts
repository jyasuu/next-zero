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
  execute: (
    args: unknown,
    context?: { toolCallId: string }
  ) => ToolExecutionResult | Promise<ToolExecutionResult>
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

export const formFillOutputSchema = z.object({
  valid: z.boolean(),
  values: z.record(z.string(), z.string()),
  errors: z.record(z.string(), z.string()),
})

export const questionOptionSchema = z.object({
  label: z.string(),
  description: z.string(),
})

export const questionPromptSchema = z.object({
  question: z.string(),
  header: z.string(),
  options: z.array(questionOptionSchema),
  multiple: z.boolean().optional(),
  custom: z.boolean().optional(),
})

export type QuestionOption = z.infer<typeof questionOptionSchema>
export type QuestionPrompt = z.infer<typeof questionPromptSchema>

export const questionOutputSchema = z.object({
  answers: z.array(z.array(z.string())),
  summary: z.string(),
})

export type QuestionOutput = z.infer<typeof questionOutputSchema>
export type QuestionAnswers = string[][]

export const skillOutputSchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
})

export type SkillOutput = z.infer<typeof skillOutputSchema>

export type UserRow = z.infer<typeof userRowOutputSchema>
export type WhoAmIOutput = z.infer<typeof whoamiOutputSchema>

export type KnownToolOutput =
  | { tool: "account_whoami"; output: WhoAmIOutput }
  | { tool: "users_list"; output: z.infer<typeof usersListOutputSchema> }
  | { tool: "users_get"; output: UserRow }
  | { tool: "users_create"; output: UserRow }
  | { tool: "users_update"; output: UserRow }
  | { tool: "users_delete"; output: z.infer<typeof deletedOutputSchema> }
  | { tool: "expenses_form_fill"; output: z.infer<typeof formFillOutputSchema> }
  | { tool: "requests_form_fill"; output: z.infer<typeof formFillOutputSchema> }
  | { tool: "question"; output: QuestionOutput }
  | { tool: "skill"; output: SkillOutput }

export type ToolId = KnownToolOutput["tool"]
