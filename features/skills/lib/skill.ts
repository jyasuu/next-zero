import { z } from "zod"

export const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

export const skillSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "name is required")
      .max(50, "name is too long")
      .regex(NAME_PATTERN, "name must contain only letters, numbers, dashes, or underscores"),
    description: z
      .string()
      .trim()
      .min(1, "description is required")
      .max(200, "description is too long"),
    content: z.string().trim().min(1, "content is required"),
  })
  .strict()

export type SkillFormInput = z.infer<typeof skillSchema>

export interface SkillRow {
  id: string
  user_email: string
  name: string
  description: string
  content: string
  created_at: string
  updated_at: string
}

export type SkillSummary = { name: string; description: string }

export function parseSkillRow(row: Record<string, unknown>): SkillRow {
  return {
    id: String(row.id),
    user_email: String(row.user_email),
    name: String(row.name),
    description: String(row.description),
    content: String(row.content),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export function skillOwnedBy(row: Pick<SkillRow, "user_email">, email: string): boolean {
  return row.user_email === email
}

export function summarizeSkills(rows: SkillRow[]): SkillSummary[] {
  return rows.map((row) => ({ name: row.name, description: row.description }))
}

export function formatSkillsAdvertisement(skills: SkillSummary[]): string | null {
  if (skills.length === 0) return null
  const lines = skills.map((skill) => `- ${skill.name}: ${skill.description}`)
  return `Available skills:\n${lines.join("\n")}`
}

export function formatSkillContentBlock(skill: { name: string; content: string }): string {
  return [
    `<skill_content name="${skill.name}">`,
    `# Skill: ${skill.name}`,
    "",
    skill.content.trim(),
    "",
    `Base directory for this skill: /skills/${skill.name}`,
    "Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.",
    "</skill_content>",
  ].join("\n")
}
