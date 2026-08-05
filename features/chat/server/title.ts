import { generateText } from "ai"
import type { LanguageModel } from "ai"
import { getChatModel, isChatEnabled } from "@/features/chat/server/model"
import { TITLE_SYSTEM_PROMPT, sanitizeTitle } from "@/features/chat/lib/title"

const DEFAULT_TIMEOUT_MS = 5000

function titleTimeoutMs(): number {
  const raw = process.env.AI_TITLE_TIMEOUT_MS
  if (!raw) return DEFAULT_TIMEOUT_MS
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

export async function generateSessionTitle(
  messageContent: string,
  model: LanguageModel = getChatModel()
): Promise<string | null> {
  if (!isChatEnabled()) return null
  try {
    const { text } = await generateText({
      model,
      system: TITLE_SYSTEM_PROMPT,
      prompt: messageContent,
      abortSignal: AbortSignal.timeout(titleTimeoutMs()),
    })
    const title = sanitizeTitle(text)
    if (!title) return null
    return title
  } catch (error) {
    console.warn("Session title generation failed:", error)
    return null
  }
}
