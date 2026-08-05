export const TITLE_MAX_LENGTH = 60

export const TITLE_MARKER = "Generate a concise title for this chat session"

export const TITLE_SYSTEM_PROMPT = `${TITLE_MARKER}. It should be a short noun phrase or imperative that captures the conversation's topic, at most ${TITLE_MAX_LENGTH} characters. Do not use quotes, trailing punctuation, or markdown. Reply with only the title text.`

export function isTitleSystemPrompt(systemContent: string | undefined): boolean {
  return systemContent?.includes(TITLE_MARKER) ?? false
}

export function sanitizeTitle(text: string): string {
  const trimmed = text.trim()
  const withoutQuotes = trimmed.replace(/^["']+|["']+$/g, "")
  return truncateTitle(withoutQuotes.replace(/\s+/g, " ").trim())
}

export function truncateTitle(text: string): string {
  return text.length > TITLE_MAX_LENGTH
    ? `${text.slice(0, TITLE_MAX_LENGTH - 1)}…`
    : text
}
