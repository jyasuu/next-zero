import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuestionCard } from "@/features/chat/components/question-card"
import type { QuestionAnswers, QuestionPrompt } from "@/features/chat/types"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

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

function renderCard(
  questions: QuestionPrompt[],
  onAnswer: (answers: QuestionAnswers) => void = vi.fn(),
  onDismiss: () => void = vi.fn()
) {
  return {
    onAnswer,
    onDismiss,
    ...render(<QuestionCard questions={questions} onAnswer={onAnswer} onDismiss={onDismiss} />),
  }
}

describe("QuestionCard", () => {
  it("renders the question text and its options", () => {
    renderCard([SINGLE])
    expect(screen.getByText("Which department?")).not.toBeNull()
    expect(screen.getByRole("radio", { name: /Engineering/ })).not.toBeNull()
    expect(screen.getByRole("radio", { name: /Finance/ })).not.toBeNull()
  })

  it("renders option descriptions", () => {
    renderCard([SINGLE])
    expect(screen.getByText("Ships software")).not.toBeNull()
  })

  it("does not render the raw JSON input", () => {
    const { container } = renderCard([SINGLE])
    expect(container.textContent).not.toContain('"question"')
    expect(container.textContent).not.toContain('"options"')
  })

  it("submits immediately when a single-select option is picked", async () => {
    const { onAnswer } = renderCard([SINGLE])
    await userEvent.click(screen.getByRole("radio", { name: /Engineering/ }))
    expect(onAnswer).toHaveBeenCalledWith([["Engineering"]])
  })

  describe("multi-select", () => {
    it("toggles options and submits the full set", async () => {
      const { onAnswer } = renderCard([MULTI])
      await userEvent.click(screen.getByRole("checkbox", { name: /Read/ }))
      await userEvent.click(screen.getByRole("checkbox", { name: /Write/ }))
      await userEvent.click(screen.getByRole("button", { name: /submit/i }))
      expect(onAnswer).toHaveBeenCalledWith([["Read", "Write"]])
    })

    it("un-toggles an option before submitting", async () => {
      const { onAnswer } = renderCard([MULTI])
      await userEvent.click(screen.getByRole("checkbox", { name: /Read/ }))
      await userEvent.click(screen.getByRole("checkbox", { name: /Write/ }))
      await userEvent.click(screen.getByRole("checkbox", { name: /Read/ }))
      await userEvent.click(screen.getByRole("button", { name: /submit/i }))
      expect(onAnswer).toHaveBeenCalledWith([["Write"]])
    })
  })

  describe("custom answer", () => {
    it("types a custom answer and submits it for a single-select question", async () => {
      const { onAnswer } = renderCard([SINGLE])
      await userEvent.click(screen.getByRole("radio", { name: /typeOwnAnswer/ }))
      await userEvent.type(screen.getByRole("textbox"), "Platform")
      await userEvent.click(screen.getByRole("button", { name: /done/i }))
      expect(onAnswer).toHaveBeenCalledWith([["Platform"]])
    })

    it("keeps a custom draft scoped to its question tab", async () => {
      const { onAnswer } = renderCard([SINGLE, MULTI])
      await userEvent.click(screen.getByRole("radio", { name: /typeOwnAnswer/ }))
      await userEvent.type(screen.getByRole("textbox"), "Platform")
      await userEvent.click(screen.getByRole("button", { name: /done/i }))
      expect(screen.getByText("Pick scopes")).not.toBeNull()
      expect(screen.queryByRole("textbox")).toBeNull()
      await userEvent.click(screen.getByRole("checkbox", { name: /Write/ }))
      await userEvent.click(screen.getByRole("button", { name: /submit/i }))
      expect(onAnswer).toHaveBeenCalledWith([["Platform"], ["Write"]])
    })
  })

  describe("dismiss", () => {
    it("calls onDismiss", async () => {
      const { onDismiss } = renderCard([SINGLE])
      await userEvent.click(screen.getByRole("button", { name: /dismiss/i }))
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe("multi-question flow", () => {
    it("advances after a single-select pick and submits all answers at the end", async () => {
      const { onAnswer } = renderCard([SINGLE, MULTI])
      await userEvent.click(screen.getByRole("radio", { name: /Engineering/ }))
      expect(screen.getByText("Pick scopes")).not.toBeNull()
      expect(onAnswer).not.toHaveBeenCalled()
      await userEvent.click(screen.getByRole("checkbox", { name: /Write/ }))
      await userEvent.click(screen.getByRole("button", { name: /submit/i }))
      expect(onAnswer).toHaveBeenCalledWith([["Engineering"], ["Write"]])
    })

    it("allows going back to a previous question", async () => {
      const { onAnswer } = renderCard([SINGLE, MULTI])
      await userEvent.click(screen.getByRole("radio", { name: /Engineering/ }))
      await userEvent.click(screen.getByRole("button", { name: /back/i }))
      expect(screen.getByText("Which department?")).not.toBeNull()
      await userEvent.click(screen.getByRole("radio", { name: /Finance/ }))
      expect(screen.getByText("Pick scopes")).not.toBeNull()
      expect(onAnswer).not.toHaveBeenCalled()
    })
  })
})
