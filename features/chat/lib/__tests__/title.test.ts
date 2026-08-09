import { describe, it, expect } from "vitest"
import { buildSystemPrompt } from "@/features/chat/lib/prompts"
import {
  TITLE_MAX_LENGTH,
  TITLE_SYSTEM_PROMPT,
  isTitleSystemPrompt,
  sanitizeTitle,
  truncateTitle,
} from "@/features/chat/lib/title"

describe("TITLE_MAX_LENGTH", () => {
  it("caps generated titles at 60 characters", () => {
    expect(TITLE_MAX_LENGTH).toBe(60)
  })
})

describe("sanitizeTitle", () => {
  it("trims surrounding whitespace", () => {
    expect(sanitizeTitle("  My Title  ")).toBe("My Title")
  })

  it("strips surrounding double quotes", () => {
    expect(sanitizeTitle('"My Title"')).toBe("My Title")
  })

  it("strips surrounding single quotes", () => {
    expect(sanitizeTitle("'My Title'")).toBe("My Title")
  })

  it("strips quotes even when padded with whitespace", () => {
    expect(sanitizeTitle('  "My Title"  ')).toBe("My Title")
  })

  it("collapses internal whitespace", () => {
    expect(sanitizeTitle("My   Title  here")).toBe("My Title here")
  })

  it("returns an empty string for whitespace-only input", () => {
    expect(sanitizeTitle("   ")).toBe("")
  })

  it("returns an empty string for input that is only quotes", () => {
    expect(sanitizeTitle('""')).toBe("")
  })

  it("caps the result at the max length", () => {
    expect(sanitizeTitle("x".repeat(120)).length).toBe(60)
  })
})

describe("truncateTitle", () => {
  it("leaves short text unchanged", () => {
    expect(truncateTitle("Hello there")).toBe("Hello there")
  })

  it("truncates long text to the max length with an ellipsis", () => {
    const long = "a".repeat(120)
    const title = truncateTitle(long)
    expect(title.length).toBe(60)
    expect(title.endsWith("…")).toBe(true)
  })
})

describe("TITLE_SYSTEM_PROMPT / isTitleSystemPrompt", () => {
  it("recognizes the production title prompt", () => {
    expect(isTitleSystemPrompt(TITLE_SYSTEM_PROMPT)).toBe(true)
  })

  it("does not recognize the chat system prompt", () => {
    const chatPrompt = buildSystemPrompt({
      email: "ada@example.com",
      roleName: "Admin",
      isAdmin: true,
      granted: ["users:Read"],
      customPrompt: "",
      tools: [],
      skills: [],
    })
    expect(isTitleSystemPrompt(chatPrompt)).toBe(false)
  })

  it("does not recognize an undefined system prompt", () => {
    expect(isTitleSystemPrompt(undefined)).toBe(false)
  })
})
