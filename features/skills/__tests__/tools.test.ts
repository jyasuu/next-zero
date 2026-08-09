import { describe, it, expect, beforeEach, vi } from "vitest"
import { skillsTools } from "@/features/skills/tools"
import { useSkillsStore } from "@/features/skills/store"
import type { SkillRow } from "@/features/skills/lib/skill"

const createTool = skillsTools.find((t) => t.id === "skills_create")!
const updateTool = skillsTools.find((t) => t.id === "skills_update")!
const deleteTool = skillsTools.find((t) => t.id === "skills_delete")!

const ROW: SkillRow = {
  id: "1",
  user_email: "ada@example.com",
  name: "expense-review",
  description: "How to review an expense request",
  content: "# Expense review\n\n1. Fetch the receipt",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  useSkillsStore.setState({ rows: [], loading: false, forbidden: false })
})

describe("skills authoring tools", () => {
  it("lists skills from the ownership-scoped API", async () => {
    const listTool = skillsTools.find((t) => t.id === "skills_list")!
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [ROW] })
    const result = await listTool.execute({})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual([ROW])
    }
    expect(fetchMock).toHaveBeenCalledWith("/api/skills", expect.objectContaining({}))
  })

  it("rejects an invalid skill name in the create tool without calling the API", async () => {
    const result = await createTool.execute({ name: "not a slug", description: "d", content: "c" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/name/i)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("upserts the created row into the page store on success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ROW })
    const result = await createTool.execute({
      name: "expense-review",
      description: "How to review an expense request",
      content: "# Expense review",
    })
    expect(result.ok).toBe(true)
    expect(useSkillsStore.getState().rows).toContainEqual(ROW)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/skills",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "expense-review",
          description: "How to review an expense request",
          content: "# Expense review",
        }),
      })
    )
  })

  it("does not touch the store when the create is refused with 403", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Forbidden" }) })
    const result = await createTool.execute({
      name: "expense-review",
      description: "How to review an expense request",
      content: "# Expense review",
    })
    expect(result.ok).toBe(false)
    expect(useSkillsStore.getState().rows).toEqual([])
  })

  it("does not touch the store when the create is refused with 409", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "A skill with this name already exists" }) })
    const result = await createTool.execute({
      name: "expense-review",
      description: "How to review an expense request",
      content: "# Expense review",
    })
    expect(result.ok).toBe(false)
    expect(useSkillsStore.getState().rows).toEqual([])
  })

  it("upserts the updated row into the page store on success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...ROW, name: "expense-review-v2" }) })
    const result = await updateTool.execute({
      id: "1",
      name: "expense-review-v2",
      description: "How to review an expense request",
      content: "# Expense review v2",
    })
    expect(result.ok).toBe(true)
    expect(useSkillsStore.getState().rows[0]?.name).toBe("expense-review-v2")
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/skills/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          name: "expense-review-v2",
          description: "How to review an expense request",
          content: "# Expense review v2",
        }),
      })
    )
  })

  it("refreshes the page store after a successful delete", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
    useSkillsStore.setState({ rows: [ROW], loading: false, forbidden: false })
    const result = await deleteTool.execute({ id: "1" })
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/skills/1", expect.objectContaining({ method: "DELETE" }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/skills")
    expect(useSkillsStore.getState().rows).toEqual([])
  })

  it("does not reload the store when the delete is refused", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: "Not found" }) })
    useSkillsStore.setState({ rows: [ROW], loading: false, forbidden: false })
    const result = await deleteTool.execute({ id: "1" })
    expect(result.ok).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(useSkillsStore.getState().rows).toHaveLength(1)
  })
})
