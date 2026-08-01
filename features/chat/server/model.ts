import type { LanguageModel } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createMockModel } from "@/features/chat/server/mock-model"

const DEFAULT_BASE_URL = "https://opencode.ai/zen/v1"
const DEFAULT_MODEL = "big-pickle"

export function isChatEnabled(): boolean {
  if (process.env.AI_ENABLED !== "true") return false
  if (process.env.AI_MOCK === "1") return true
  return Boolean(process.env.AI_API_KEY)
}

export function getChatModel(): LanguageModel {
  if (process.env.AI_MOCK === "1") {
    return createMockModel() as LanguageModel
  }
  const baseURL = process.env.AI_BASE_URL || DEFAULT_BASE_URL
  const apiKey = process.env.AI_API_KEY || ""
  const model = process.env.AI_MODEL || DEFAULT_MODEL
  const client = createOpenAI({ baseURL, apiKey })
  return client.chat(model)
}
