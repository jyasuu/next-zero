import { z } from "zod"
import type { ChatTool } from "@/features/chat/types"
import { fetchJson } from "@/features/chat/tools/fetch-json"
import { formatSkillContentBlock, type SkillRow } from "@/features/skills/lib/skill"

export const skillToolInputSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
})

export const skillTool: ChatTool = {
  id: "skill",
  name: "Load a skill",
  description:
    "Loads a user-authored skill (a reusable workflow) by name from the caller's Available skills inventory and returns its full contents as a skill_content block. The loaded instructions then guide which existing tools to call. Loading a skill requires the user's approval and never grants access beyond the caller's own permissions.",
  inputSchema: skillToolInputSchema,
  approval: "always",
  execute: async (args) => {
    const parsed = skillToolInputSchema.safeParse(args)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "value"}: ${issue.message}`
      )
      return { ok: false, error: issues.join("; ") }
    }
    const result = await fetchJson<SkillRow>(`/api/skills/by-name/${encodeURIComponent(parsed.data.name)}`)
    if (!result.ok) return result
    const { name, description, content } = result.data
    return {
      ok: true,
      data: {
        name,
        description,
        content: formatSkillContentBlock({ name, content }),
      },
    }
  },
}
