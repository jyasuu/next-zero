import { describe, expect, it } from "vitest"
import { queryAll, queryRow, run } from "@/lib/db"
import { getRoleWithPolicies } from "@/lib/roles"
import { getCustomPrompt, setCustomPrompt } from "@/features/chat/server/settings"
import type { ChatMessageLike } from "@/features/chat/lib/sessions"
import {
  createSession,
  getOwnedSession,
  listActiveSessions,
  loadSessionMessages,
  saveSessionMessages,
  softDeleteSession,
} from "@/features/chat/server/sessions"

const describeDb = process.env.PG_SMOKE === "1" ? describe : describe.skip

describeDb("postgres data layer", () => {
  it("auto-creates schema and seeds roles + users", async () => {
    const roles = await queryAll("SELECT id, name FROM roles ORDER BY id")
    expect(roles.length).toBe(4)
    expect(roles.map((r) => r.name)).toEqual(["Admin", "Editor", "Viewer", "Auditor"])
    const users = await queryAll("SELECT count(*)::int AS count FROM users")
    expect(users[0].count).toBe(12)
  })

  it("seeds are idempotent (second init keeps rows)", async () => {
    const roles = await queryAll("SELECT count(*)::int AS count FROM roles")
    expect(roles[0].count).toBe(4)
  })

  it("role policies parse through the cache layer", async () => {
    const admin = await getRoleWithPolicies("Admin")
    expect(admin?.permissions).toContain("manage_users")
    expect(JSON.stringify(admin?.policies)).toContain("dashboard:Read")
  })

  it("settings upsert round-trips", async () => {
    await setCustomPrompt("ada@example.com", "Be terse.")
    expect(await getCustomPrompt("ada@example.com")).toBe("Be terse.")
    await setCustomPrompt("ada@example.com", "Be verbose.")
    expect(await getCustomPrompt("ada@example.com")).toBe("Be verbose.")
  })

  it("chat session create/save/load/delete works", async () => {
    const email = "smoke@example.com"
    const session = await createSession(email)
    expect(session.title).toBe("")

    expect(await getOwnedSession(email, session.id)).not.toBeNull()
    expect(await getOwnedSession("other@example.com", session.id)).toBeNull()

    const messages: ChatMessageLike[] = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "hello" }] },
    ]
    const saved = await saveSessionMessages(email, session.id, messages)
    expect(saved?.title).toBe("hi")

    const loaded = await loadSessionMessages(email, session.id)
    expect(loaded?.length).toBe(2)
    expect(loaded?.[1].parts[0].text).toBe("hello")

    const listed = await listActiveSessions(email)
    expect(listed.some((s) => s.id === session.id)).toBe(true)

    await expect(softDeleteSession(email, session.id)).resolves.toBe(true)
    await expect(softDeleteSession(email, session.id)).resolves.toBe(false)
    await expect(getOwnedSession(email, session.id)).resolves.toBeNull()
  })

  it("keeps the first-save title stable on later saves", async () => {
    const email = "stable@example.com"
    const session = await createSession(email)

    await saveSessionMessages(email, session.id, [
      { id: "s1", role: "user", parts: [{ type: "text", text: "First message" }] },
      { id: "s2", role: "assistant", parts: [{ type: "text", text: "First reply" }] },
    ])
    const secondSave = await saveSessionMessages(email, session.id, [
      { id: "s3", role: "user", parts: [{ type: "text", text: "A much longer second message than the first" }] },
    ])

    expect(secondSave?.title).toBe("First message")
    const persisted = await getOwnedSession(email, session.id)
    expect(persisted?.title).toBe("First message")
  })

  it("users CRUD via run/queryRow", async () => {
    const id = String(Date.now())
    await run(
      "INSERT INTO users (id, name, email, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [id, "Smoke", "smoke@example.com", "Viewer", "active", "2026-01-01"]
    )
    const row = await queryRow("SELECT * FROM users WHERE id = $1", [id])
    expect(row?.email).toBe("smoke@example.com")
    await run("DELETE FROM users WHERE id = $1", [id])
    expect(await queryRow("SELECT * FROM users WHERE id = $1", [id])).toBeNull()
  })
})
