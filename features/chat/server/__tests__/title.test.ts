import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { LanguageModel } from "ai"
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider"
import { generateSessionTitle } from "@/features/chat/server/title"

const originalEnv = { ...process.env }

function stubModel(options: {
  text?: string
  error?: boolean
  hang?: boolean
}): LanguageModel {
  const { text = "", error = false, hang = false } = options

  type StubResult = Omit<LanguageModelV4GenerateResult, "content"> & {
    content: [{ type: "text"; text: string }]
  }

  const doGenerate = (
    callOptions: LanguageModelV4CallOptions
  ): Promise<StubResult> => {
    if (hang) {
      return new Promise((_resolve, reject) => {
        callOptions.abortSignal?.addEventListener("abort", () => reject(new Error("aborted")))
      })
    }
    if (error) return Promise.reject(new Error("model failure"))
    return Promise.resolve({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 0, text: 0, reasoning: 0 },
      },
      warnings: [],
    })
  }

  return {
    specificationVersion: "v4",
    provider: "stub",
    modelId: "stub-title",
    supportedUrls: {},
    doGenerate,
    async doStream(callOptions) {
      const result = await doGenerate(callOptions)
      const id = "stub-text"
      const parts: LanguageModelV4StreamPart[] = [
        { type: "text-start", id },
        { type: "text-delta", id, delta: result.content[0].text },
        { type: "text-end", id },
        {
          type: "finish",
          finishReason: { unified: "stop", raw: undefined },
          usage: result.usage,
        },
      ]
      return {
        stream: new ReadableStream({
          start(controller) {
            for (const part of parts) controller.enqueue(part)
            controller.close()
          },
        }),
      }
    },
  }
}

describe("generateSessionTitle", () => {
  beforeEach(() => {
    process.env.AI_ENABLED = "true"
    delete process.env.AI_TITLE_TIMEOUT_MS
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns null when the chat feature is disabled", async () => {
    delete process.env.AI_ENABLED
    expect(await generateSessionTitle("Hello", stubModel({ text: "Greeting" }))).toBeNull()
  })

  it("returns a sanitized title from the model output", async () => {
    expect(
      await generateSessionTitle("How do I reset a password?", stubModel({ text: '  "Reset a password"  ' }))
    ).toBe("Reset a password")
  })

  it("returns null when the model output is empty", async () => {
    expect(await generateSessionTitle("Hello", stubModel({ text: "   " }))).toBeNull()
  })

  it("caps the model output at the max title length", async () => {
    const title = await generateSessionTitle("Hello", stubModel({ text: "x".repeat(100) }))
    expect(title).not.toBeNull()
    expect((title as string).length).toBe(60)
    expect((title as string).endsWith("…")).toBe(true)
  })

  it("returns null when the model call fails", async () => {
    expect(await generateSessionTitle("Hello", stubModel({ error: true }))).toBeNull()
  })

  it("returns null when the model call times out", async () => {
    process.env.AI_TITLE_TIMEOUT_MS = "20"
    expect(await generateSessionTitle("Hello", stubModel({ hang: true }))).toBeNull()
  })
})
