import { describe, it, expect } from "vitest"
import {
  filterActiveSessions,
  sessionOwnedBy,
  seedTitleFromMessages,
  serializeParts,
  deserializeParts,
} from "@/features/chat/lib/sessions"

const sessionRow = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  user_email: "ada@example.com",
  title: "",
  created_at: "2026-07-01T10:00:00.000Z",
  updated_at: "2026-07-01T10:00:00.000Z",
  deleted_at: null,
  ...overrides,
})

describe("filterActiveSessions", () => {
  it("returns an empty list for no rows", () => {
    expect(filterActiveSessions([])).toEqual([])
  })

  it("excludes soft-deleted sessions", () => {
    const rows = [
      sessionRow({ id: "s1" }),
      sessionRow({ id: "s2", deleted_at: "2026-07-02T00:00:00.000Z" }),
    ]
    const active = filterActiveSessions(rows)
    expect(active.map((s) => s.id)).toEqual(["s1"])
  })

  it("maps row fields onto the session shape", () => {
    const [session] = filterActiveSessions([
      sessionRow({ id: "s1", title: "My chat", created_at: "2026-07-01T10:00:00.000Z", updated_at: "2026-07-01T11:00:00.000Z" }),
    ])
    expect(session).toEqual({
      id: "s1",
      title: "My chat",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T11:00:00.000Z",
    })
  })

  it("sorts sessions by updated_at, most recent first", () => {
    const rows = [
      sessionRow({ id: "old", updated_at: "2026-07-01T10:00:00.000Z" }),
      sessionRow({ id: "new", updated_at: "2026-07-02T10:00:00.000Z" }),
      sessionRow({ id: "mid", updated_at: "2026-07-01T12:00:00.000Z" }),
    ]
    expect(filterActiveSessions(rows).map((s) => s.id)).toEqual(["new", "mid", "old"])
  })
})

describe("sessionOwnedBy", () => {
  it("returns true when the session belongs to the email", () => {
    expect(sessionOwnedBy(sessionRow({ user_email: "ada@example.com" }), "ada@example.com")).toBe(true)
  })

  it("returns false for another email", () => {
    expect(sessionOwnedBy(sessionRow({ user_email: "ada@example.com" }), "bob@example.com")).toBe(false)
  })

  it("returns false when the row has no owner", () => {
    expect(sessionOwnedBy(sessionRow({ user_email: null }), "ada@example.com")).toBe(false)
  })
})

describe("seedTitleFromMessages", () => {
  const userMsg = (text: string) => ({
    role: "user",
    id: "u1",
    parts: [{ type: "text", text }],
  })

  it("uses the first user text message", () => {
    expect(seedTitleFromMessages([userMsg("List all users"), { role: "assistant", id: "a1", parts: [{ type: "text", text: "Here you go" }] }])).toBe("List all users")
  })

  it("returns null when there is no user text", () => {
    expect(seedTitleFromMessages([{ role: "assistant", id: "a1", parts: [{ type: "text", text: "Hi" }] }])).toBeNull()
  })

  it("ignores non-text user parts for the title", () => {
    const msgs = [
      { role: "user", id: "u1", parts: [{ type: "tool-output", toolCallId: "t1", output: {} }] },
      userMsg("Second message"),
    ]
    expect(seedTitleFromMessages(msgs)).toBe("Second message")
  })

  it("truncates long titles", () => {
    const long = "x".repeat(120)
    const title = seedTitleFromMessages([userMsg(long)])
    expect(title).toBeTruthy()
    expect((title as string).length).toBeLessThanOrEqual(60)
  })
})

describe("serializeParts / deserializeParts", () => {
  const parts = [
    { type: "text", text: "hello" },
    {
      type: "tool-input",
      toolCallId: "call_1",
      toolName: "users_create",
      input: { name: "Ada", email: "ada@example.com" },
      state: "output-available",
      output: { ok: true, data: { id: "99" } },
    },
  ]

  it("round-trips parts through JSON", () => {
    const json = serializeParts(parts)
    const restored = deserializeParts(json)
    expect(restored).toEqual(parts)
  })

  it("produces valid JSON", () => {
    expect(() => JSON.parse(serializeParts(parts))).not.toThrow()
  })

  it("falls back to an empty array for corrupt JSON", () => {
    expect(deserializeParts("not json")).toEqual([])
  })
})
