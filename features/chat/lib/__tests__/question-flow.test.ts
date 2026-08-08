import { describe, it, expect } from "vitest"
import {
  advanceAfterPick,
  buildAnswers,
  createQuestionFlow,
  formatAnswersSummary,
  pickOption,
  setCustom,
  type QuestionFlowState,
} from "@/features/chat/lib/question-flow"
import type { QuestionPrompt } from "@/features/chat/types"

const SINGLE: QuestionPrompt = {
  question: "Which department?",
  header: "Department",
  options: [
    { label: "Engineering", description: "Ships software" },
    { label: "Finance", description: "Owns budgets" },
  ],
}

const MULTI: QuestionPrompt = {
  question: "Pick scopes",
  header: "Scopes",
  multiple: true,
  options: [
    { label: "Read", description: "Read-only access" },
    { label: "Write", description: "Modify access" },
  ],
}

function answersOf(state: QuestionFlowState, tab = 0): string[] {
  return state.answers[tab] ?? []
}

describe("createQuestionFlow", () => {
  it("starts with empty answers and custom text per question", () => {
    const state = createQuestionFlow(3)
    expect(state.answers).toEqual([[], [], []])
    expect(state.custom).toEqual(["", "", ""])
  })
})

describe("pickOption", () => {
  it("sets a single answer for a single-select question", () => {
    const next = pickOption(createQuestionFlow(1), 0, false, "Engineering")
    expect(answersOf(next)).toEqual(["Engineering"])
  })

  it("replaces the previous single answer when picking another option", () => {
    let state = createQuestionFlow(1)
    state = pickOption(state, 0, false, "Engineering")
    state = pickOption(state, 0, false, "Finance")
    expect(answersOf(state)).toEqual(["Finance"])
  })

  it("toggles an option into a multi-select answer set", () => {
    const next = pickOption(createQuestionFlow(1), 0, true, "Read")
    expect(answersOf(next)).toEqual(["Read"])
  })

  it("toggles an option back out of a multi-select answer set", () => {
    let state = pickOption(createQuestionFlow(1), 0, true, "Read")
    state = pickOption(state, 0, true, "Write")
    state = pickOption(state, 0, true, "Read")
    expect(answersOf(state)).toEqual(["Write"])
  })
})

describe("setCustom", () => {
  it("uses trimmed custom text as the single answer for single-select", () => {
    const next = setCustom(createQuestionFlow(1), 0, false, "  Platform  ")
    expect(answersOf(next)).toEqual(["Platform"])
    expect(stateCustom(next)).toEqual("  Platform  ")
  })

  it("replaces a picked option when custom text is typed for single-select", () => {
    let state = pickOption(createQuestionFlow(1), 0, false, "Engineering")
    state = setCustom(state, 0, false, "Platform")
    expect(answersOf(state)).toEqual(["Platform"])
  })

  it("clears the single answer when custom text is emptied", () => {
    let state = setCustom(createQuestionFlow(1), 0, false, "Platform")
    state = setCustom(state, 0, false, "   ")
    expect(answersOf(state)).toEqual([])
  })

  it("appends the custom contribution to a multi-select set", () => {
    let state = pickOption(createQuestionFlow(1), 0, true, "Read")
    state = setCustom(state, 0, true, "Audit")
    expect(answersOf(state)).toEqual(["Read", "Audit"])
  })

  it("replaces the previous custom contribution in a multi-select set", () => {
    let state = setCustom(createQuestionFlow(1), 0, true, "Audit")
    state = setCustom(state, 0, true, "Compliance")
    expect(answersOf(state)).toEqual(["Compliance"])
  })

  it("removes the custom contribution from a multi-select set when emptied", () => {
    let state = pickOption(createQuestionFlow(1), 0, true, "Read")
    state = setCustom(state, 0, true, "Audit")
    state = setCustom(state, 0, true, "")
    expect(answersOf(state)).toEqual(["Read"])
  })
})

describe("buildAnswers", () => {
  it("returns empty arrays for unanswered questions", () => {
    expect(buildAnswers(createQuestionFlow(2), 2)).toEqual([[], []])
  })

  it("returns the per-question answers in order", () => {
    let state = createQuestionFlow(2)
    state = pickOption(state, 0, false, "Engineering")
    state = pickOption(state, 1, true, "Read")
    state = pickOption(state, 1, true, "Write")
    expect(buildAnswers(state, 2)).toEqual([["Engineering"], ["Read", "Write"]])
  })
})

describe("advanceAfterPick", () => {
  it("submits immediately for a single single-select question", () => {
    const state = pickOption(createQuestionFlow(1), 0, false, "Engineering")
    const step = advanceAfterPick(state, 0, 1, false)
    expect(step.kind).toBe("submit")
    if (step.kind === "submit") expect(step.answers).toEqual([["Engineering"]])
  })

  it("advances to the next question for a single-select question in a multi-question flow", () => {
    const state = pickOption(createQuestionFlow(2), 0, false, "Engineering")
    const step = advanceAfterPick(state, 0, 2, false)
    expect(step.kind).toBe("advance")
    if (step.kind === "advance") expect(step.nextTab).toBe(1)
  })

  it("submits when a single-select question is answered on the last tab", () => {
    const state = pickOption(createQuestionFlow(2), 1, false, "Finance")
    const step = advanceAfterPick(state, 1, 2, false)
    expect(step.kind).toBe("submit")
    if (step.kind === "submit") expect(step.answers).toEqual([[], ["Finance"]])
  })

  it("waits for an explicit submit for a multi-select question", () => {
    const state = pickOption(createQuestionFlow(1), 0, true, "Read")
    expect(advanceAfterPick(state, 0, 1, true).kind).toBe("wait")
  })
})

describe("formatAnswersSummary", () => {
  it("quotes the question and answers joined with commas", () => {
    const questions = [SINGLE, MULTI]
    const summary = formatAnswersSummary(questions, [["Engineering"], ["Read", "Write"]])
    expect(summary).toBe(
      'User has answered your questions: "Which department?"="Engineering", "Pick scopes"="Read, Write". You can now continue with the user\'s answers in mind.'
    )
  })

  it("marks unanswered questions as Unanswered", () => {
    const summary = formatAnswersSummary([SINGLE], [[]])
    expect(summary).toBe(
      'User has answered your questions: "Which department?"="Unanswered". You can now continue with the user\'s answers in mind.'
    )
  })
})

function stateCustom(state: QuestionFlowState, tab = 0): string {
  return state.custom[tab] ?? ""
}
