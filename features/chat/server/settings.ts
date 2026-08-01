import { getDb, queryRow, save } from "@/lib/db"

export async function getCustomPrompt(email: string): Promise<string> {
  if (!email) return ""
  const db = await getDb()
  const row = queryRow(db, "SELECT custom_prompt FROM user_settings WHERE user_email = ?", [email])
  return (row?.custom_prompt as string) ?? ""
}

export async function setCustomPrompt(email: string, customPrompt: string): Promise<void> {
  if (!email) return
  const db = await getDb()
  db.run(
    "INSERT INTO user_settings (user_email, custom_prompt) VALUES (?, ?) ON CONFLICT(user_email) DO UPDATE SET custom_prompt = excluded.custom_prompt",
    [email, customPrompt]
  )
  save(db)
}
