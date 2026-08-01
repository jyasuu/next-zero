import type { z } from "zod"
import type { ChatTool } from "@/features/chat/types"

export function shouldRequireApproval(tool: ChatTool): boolean {
  return tool.approval === "always"
}

export type ValidateResult =
  | { ok: true; args: unknown }
  | { ok: false; error: string }

export function validateToolArgs(
  schema: z.ZodTypeAny,
  args: unknown
): ValidateResult {
  const strictSchema =
    typeof (schema as z.ZodObject<never>).strict === "function"
      ? (schema as z.ZodObject<never>).strict()
      : schema
  const result = strictSchema.safeParse(args)
  if (result.success) {
    return { ok: true, args: result.data }
  }
  const issues = result.error.issues
    .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
    .join("; ")
  return { ok: false, error: issues }
}
