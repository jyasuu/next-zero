import { describe, it, expect, vi } from "vitest"
import {
  QUESTION_DISMISSED_MESSAGE,
  answerQuestion,
  dismissQuestion,
  registerPendingQuestion,
} from "@/features/chat/lib/pending-question"

describe("pending question registry", () => {
  it("resolves a registered question with the answers", async () => {
    const promise = registerPendingQuestion("call-1")
    const settled = vi.fn()
    void promise.then(settled)
    expect(settled).not.toHaveBeenCalled()

    expect(answerQuestion("call-1", [["Engineering"]])).toBe(true)
    await expect(promise).resolves.toEqual([["Engineering"]])
  })

  it("rejects a registered question on dismissal", async () => {
    const promise = registerPendingQuestion("call-2")
    expect(dismissQuestion("call-2")).toBe(true)
    await expect(promise).rejects.toThrow(QUESTION_DISMISSED_MESSAGE)
  })

  it("keeps the promise pending until resolved", async () => {
    const promise = registerPendingQuestion("call-3")
    const settled = vi.fn()
    void promise.then(settled, settled)
    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()
    answerQuestion("call-3", [["A"]])
  })

  it("reports false for unknown ids on answer and dismiss", () => {
    expect(answerQuestion("nope", [["A"]])).toBe(false)
    expect(dismissQuestion("nope")).toBe(false)
  })
})
