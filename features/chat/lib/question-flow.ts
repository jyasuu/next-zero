import type { QuestionAnswers, QuestionPrompt } from "@/features/chat/types"
import { parseToolInput } from "@/features/chat/lib/parts"

export interface QuestionFlowState {
  answers: QuestionAnswers
  custom: string[]
}

export function questionsFromInput(input: unknown): QuestionPrompt[] {
  const parsed = parseToolInput(input)
  if (typeof parsed === "object" && parsed !== null) {
    const list = (parsed as { questions?: unknown }).questions
    if (Array.isArray(list)) return list as QuestionPrompt[]
  }
  return []
}

export type AdvanceStep =
  | { kind: "submit"; state: QuestionFlowState; answers: QuestionAnswers }
  | { kind: "advance"; state: QuestionFlowState; nextTab: number }
  | { kind: "wait"; state: QuestionFlowState }

export function createQuestionFlow(total: number): QuestionFlowState {
  return {
    answers: Array.from({ length: total }, () => [] as string[]),
    custom: Array.from({ length: total }, () => ""),
  }
}

function withAnswers(state: QuestionFlowState, tab: number, answers: string[]): QuestionFlowState {
  const next = [...state.answers]
  next[tab] = answers
  return { ...state, answers: next }
}

function withCustom(state: QuestionFlowState, tab: number, value: string): QuestionFlowState {
  const next = [...state.custom]
  next[tab] = value
  return { ...state, custom: next }
}

export function pickOption(
  state: QuestionFlowState,
  tab: number,
  multiple: boolean,
  label: string
): QuestionFlowState {
  if (multiple) {
    const current = state.answers[tab] ?? []
    const next = current.includes(label) ? current.filter((a) => a !== label) : [...current, label]
    return withAnswers(state, tab, next)
  }
  return withAnswers(state, tab, [label])
}

export function setCustom(
  state: QuestionFlowState,
  tab: number,
  multiple: boolean,
  value: string
): QuestionFlowState {
  const trimmed = value.trim()
  const previous = (state.custom[tab] ?? "").trim()
  const current = state.answers[tab] ?? []

  if (!multiple) {
    return withAnswers(withCustom(state, tab, value), tab, trimmed ? [trimmed] : [])
  }

  const withoutPrevious = current.filter((a) => a !== previous)
  const next = trimmed ? [...withoutPrevious, trimmed] : withoutPrevious
  return withAnswers(withCustom(state, tab, value), tab, next)
}

export function buildAnswers(state: QuestionFlowState, total: number): QuestionAnswers {
  return Array.from({ length: total }, (_, i) => state.answers[i] ?? [])
}

export function advanceAfterPick(
  state: QuestionFlowState,
  tab: number,
  total: number,
  multiple: boolean
): AdvanceStep {
  if (multiple) return { kind: "wait", state }
  if (tab >= total - 1) return { kind: "submit", state, answers: buildAnswers(state, total) }
  return { kind: "advance", state, nextTab: tab + 1 }
}

export function formatAnswersSummary(
  questions: ReadonlyArray<QuestionPrompt>,
  answers: QuestionAnswers
): string {
  const formatted = questions
    .map(
      (question, index) =>
        `"${question.question}"="${answers[index]?.length ? answers[index].join(", ") : "Unanswered"}"`
    )
    .join(", ")
  return `User has answered your questions: ${formatted}. You can now continue with the user's answers in mind.`
}
