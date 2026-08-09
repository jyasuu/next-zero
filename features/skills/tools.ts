import { z } from "zod"
import type { ChatTool } from "@/features/chat/types"
import { fetchJson } from "@/features/chat/tools/fetch-json"
import { formatSkillContentBlock, skillSchema, type SkillRow } from "@/features/skills/lib/skill"
import { useSkillsStore } from "@/features/skills/store"

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

const skillFieldsSchema = z.object({
  name: skillSchema.shape.name,
  description: skillSchema.shape.description,
  content: skillSchema.shape.content,
})

const skillsListSchema = z.object({})

const skillsCreateSchema = skillFieldsSchema

const skillsUpdateSchema = z.object({
  id: z.string().min(1, "id is required"),
  ...skillFieldsSchema.shape,
})

const skillsDeleteSchema = z.object({
  id: z.string().min(1, "id is required"),
})

export const skillsTools: ChatTool[] = [
  {
    id: "skills_list",
    name: "List skills",
    description: "Lists the caller's authored skills.",
    inputSchema: skillsListSchema,
    approval: "auto",
    execute: async () => fetchJson<SkillRow[]>("/api/skills"),
  },
  {
    id: "skills_create",
    name: "Create skill",
    description: "Creates a skill with a slug name, a one-line description, and a markdown content body that the assistant can later load as a reusable workflow.",
    inputSchema: skillsCreateSchema,
    approval: "always",
    execute: async (args) => {
      const parsed = skillsCreateSchema.safeParse(args)
      if (!parsed.success) {
        const issues = parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "value"}: ${issue.message}`
        )
        return { ok: false, error: issues.join("; ") }
      }
      const result = await fetchJson<SkillRow>("/api/skills", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      })
      if (result.ok) useSkillsStore.getState().upsert(result.data)
      return result
    },
  },
  {
    id: "skills_update",
    name: "Update skill",
    description: "Updates a skill's name, description, or content by id.",
    inputSchema: skillsUpdateSchema,
    approval: "always",
    execute: async (args) => {
      const parsed = skillsUpdateSchema.safeParse(args)
      if (!parsed.success) {
        const issues = parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "value"}: ${issue.message}`
        )
        return { ok: false, error: issues.join("; ") }
      }
      const { id, ...data } = parsed.data
      const result = await fetchJson<SkillRow>(`/api/skills/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      })
      if (result.ok) useSkillsStore.getState().upsert(result.data)
      return result
    },
  },
  {
    id: "skills_delete",
    name: "Delete skill",
    description: "Deletes a skill by id.",
    inputSchema: skillsDeleteSchema,
    approval: "always",
    execute: async (args) => {
      const parsed = skillsDeleteSchema.safeParse(args)
      if (!parsed.success) {
        const issues = parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "value"}: ${issue.message}`
        )
        return { ok: false, error: issues.join("; ") }
      }
      const result = await fetchJson<{ success: true }>(`/api/skills/${encodeURIComponent(parsed.data.id)}`, {
        method: "DELETE",
      })
      if (result.ok) {
        await useSkillsStore.getState().load()
      }
      return result
    },
  },
]
