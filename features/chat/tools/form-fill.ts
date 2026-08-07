import { z } from "zod"
import { formFillOutputSchema, type ChatTool } from "@/features/chat/types"

export interface FormFillToolOptions {
  id: string
  name: string
  description: string
  schema: z.ZodObject<z.ZodRawShape>
}

export type FormFillOutput = z.infer<typeof formFillOutputSchema>

export function createFormFillTool({
  id,
  name,
  description,
  schema,
}: FormFillToolOptions): ChatTool {
  const fields = Object.keys(schema.shape)
  const inputSchema = z.object(
    Object.fromEntries(fields.map((field) => [field, z.string().trim().min(1, "value is required")]))
  )

  return {
    id,
    name,
    description,
    inputSchema,
    approval: "auto",
    execute: (args) => {
      const values = (args ?? {}) as Record<string, string>
      const parsed = schema.safeParse(values)
      if (parsed.success) {
        return { ok: true, data: { valid: true, values, errors: {} } }
      }
      const fieldErrors = parsed.error.flatten().fieldErrors
      const errors: Record<string, string> = {}
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (messages && messages.length > 0) errors[field] = messages[0]
      }
      for (const issue of parsed.error.issues) {
        if (issue.code === "unrecognized_keys") {
          for (const key of issue.keys) {
            if (!errors[key]) errors[key] = issue.message
          }
        }
      }
      return { ok: true, data: { valid: false, values, errors } }
    },
  }
}
