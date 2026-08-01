import type { z } from "zod"

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
