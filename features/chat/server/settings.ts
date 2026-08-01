import { queryRow, run } from "@/lib/db"

export async function getCustomPrompt(email: string): Promise<string> {
  if (!email) return ""
  const row = await queryRow("SELECT custom_prompt FROM user_settings WHERE user_email = $1", [email])
  return (row?.custom_prompt as string) ?? ""
}

export async function setCustomPrompt(email: string, customPrompt: string): Promise<void> {
  if (!email) return
  await run(
    "INSERT INTO user_settings (user_email, custom_prompt) VALUES ($1, $2) ON CONFLICT (user_email) DO UPDATE SET custom_prompt = EXCLUDED.custom_prompt",
    [email, customPrompt]
  )
}
