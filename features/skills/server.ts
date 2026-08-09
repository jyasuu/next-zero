import { queryAll, queryRow, run } from "@/lib/db"
import { parseSkillRow, skillOwnedBy, type SkillFormInput, type SkillRow } from "@/features/skills/lib/skill"

function nowIso(): string {
  return new Date().toISOString()
}

export async function getSkillsByOwner(email: string): Promise<SkillRow[]> {
  const rows = await queryAll(
    "SELECT * FROM skills WHERE user_email = $1 ORDER BY updated_at DESC",
    [email]
  )
  return rows.map(parseSkillRow)
}

export async function getOwnedSkillById(email: string, id: string): Promise<SkillRow | null> {
  const row = await queryRow("SELECT * FROM skills WHERE id = $1", [id])
  if (!row) return null
  const skill = parseSkillRow(row)
  return skillOwnedBy(skill, email) ? skill : null
}

export async function getOwnedSkillByName(email: string, name: string): Promise<SkillRow | null> {
  const row = await queryRow("SELECT * FROM skills WHERE user_email = $1 AND name = $2", [email, name])
  if (!row) return null
  return parseSkillRow(row)
}

export async function skillNameTakenByOwner(
  email: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const rows =
    excludeId === undefined
      ? await queryAll("SELECT id FROM skills WHERE user_email = $1 AND name = $2", [email, name])
      : await queryAll("SELECT id FROM skills WHERE user_email = $1 AND name = $2 AND id <> $3", [
          email,
          name,
          excludeId,
        ])
  return rows.length > 0
}

export async function createSkill(email: string, data: SkillFormInput): Promise<SkillRow> {
  const id = String(Date.now())
  const now = nowIso()
  await run(
    "INSERT INTO skills (id, user_email, name, description, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [id, email, data.name, data.description, data.content, now, now]
  )
  return { id, user_email: email, ...data, created_at: now, updated_at: now }
}

export async function updateOwnedSkill(
  email: string,
  id: string,
  data: SkillFormInput
): Promise<SkillRow | null> {
  const existing = await getOwnedSkillById(email, id)
  if (!existing) return null
  const now = nowIso()
  await run(
    "UPDATE skills SET name = $1, description = $2, content = $3, updated_at = $4 WHERE id = $5",
    [data.name, data.description, data.content, now, id]
  )
  return { ...existing, ...data, updated_at: now }
}

export async function deleteOwnedSkill(email: string, id: string): Promise<boolean> {
  const result = await run("DELETE FROM skills WHERE id = $1 AND user_email = $2", [id, email])
  return result.rowCount > 0
}
