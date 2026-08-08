import type { QuestionAnswers } from "@/features/chat/types"

export const QUESTION_DISMISSED_MESSAGE = "The user dismissed this question"

interface PendingQuestion {
  resolve: (answers: QuestionAnswers) => void
  reject: (reason: Error) => void
}

const pending = new Map<string, PendingQuestion>()

export function registerPendingQuestion(toolCallId: string): Promise<QuestionAnswers> {
  return new Promise<QuestionAnswers>((resolve, reject) => {
    pending.set(toolCallId, { resolve, reject })
  })
}

export function answerQuestion(toolCallId: string, answers: QuestionAnswers): boolean {
  const item = pending.get(toolCallId)
  if (!item) return false
  pending.delete(toolCallId)
  item.resolve(answers)
  return true
}

export function dismissQuestion(toolCallId: string): boolean {
  const item = pending.get(toolCallId)
  if (!item) return false
  pending.delete(toolCallId)
  item.reject(new Error(QUESTION_DISMISSED_MESSAGE))
  return true
}
