import React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import enMessages from "@/messages/en.json"
import { SkillsPanel } from "@/features/skills/components/skills-panel"
import { useSkillsStore } from "@/features/skills/store"
import type { SkillRow } from "@/features/skills/lib/skill"

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <SkillsPanel />
    </NextIntlClientProvider>
  )
}

const ROW: SkillRow = {
  id: "1",
  user_email: "ada@example.com",
  name: "expense-review",
  description: "How to review an expense request",
  content: "# Expense review\n\n1. Fetch the receipt",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
}

function jsonResponse(body: unknown, status = 200) {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response
}

describe("SkillsPanel", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    useSkillsStore.setState({ rows: [], loading: true, forbidden: false })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("lists the caller's skills", async () => {
    fetchMock.mockResolvedValue(jsonResponse([ROW]))
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText("expense-review")).not.toBeNull()
    })
    expect(screen.getByText("How to review an expense request")).not.toBeNull()
    expect(fetchMock).toHaveBeenCalledWith("/api/skills")
  })

  it("shows the empty state when the caller has no skills", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText("No skills yet. Author a workflow to get started.")).not.toBeNull()
    })
  })

  it("shows the forbidden card on a 403", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Forbidden" }, 403))
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText("You don't have permission to view this content.")).not.toBeNull()
    })
  })

  it("creates a skill and adds it to the list", async () => {
    const created: SkillRow = {
      ...ROW,
      id: "2",
      name: "export-report",
      description: "Export and reconcile a report",
    }
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(created, 201))
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText("No skills yet. Author a workflow to get started.")).not.toBeNull()
    })

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "export-report" } })
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Export and reconcile a report" },
    })
    fireEvent.change(screen.getByLabelText("Content"), { target: { value: "1. Build the report" } })
    fireEvent.click(screen.getByRole("button", { name: "Create skill" }))

    await waitFor(() => {
      expect(screen.getByText("export-report")).not.toBeNull()
    })
    const [listCall, createCall] = fetchMock.mock.calls
    expect(listCall[0]).toBe("/api/skills")
    expect(createCall[0]).toBe("/api/skills")
    expect(createCall[1]?.method).toBe("POST")
    const sent = JSON.parse((createCall[1]?.body as string) ?? "{}")
    expect(sent).toEqual({
      name: "export-report",
      description: "Export and reconcile a report",
      content: "1. Build the report",
    })
  })

  it("rejects a duplicate name with the existing-name message", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([ROW]))
      .mockResolvedValueOnce(jsonResponse({ error: "A skill with this name already exists" }, 409))
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText("expense-review")).not.toBeNull()
    })

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "expense-review" } })
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Another review" } })
    fireEvent.change(screen.getByLabelText("Content"), { target: { value: "step one" } })
    fireEvent.click(screen.getByRole("button", { name: "Create skill" }))

    await waitFor(() => {
      expect(screen.getByText("A skill with this name already exists.")).not.toBeNull()
    })
  })

  it("shows field validation errors for an empty submission", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText("No skills yet. Author a workflow to get started.")).not.toBeNull()
    })

    fireEvent.click(screen.getByRole("button", { name: "Create skill" }))
    await waitFor(() => {
      expect(screen.getByText("Name is required.")).not.toBeNull()
    })
    expect(screen.getByText("Description is required.")).not.toBeNull()
    expect(screen.getByText("Content is required.")).not.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("edits a skill in the dialog and updates the list", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([ROW]))
      .mockResolvedValueOnce(jsonResponse({ ...ROW, name: "expense-review-v2" }))
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText("expense-review")).not.toBeNull()
    })

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    const dialog = await screen.findByRole("dialog")
    const nameInput = within(dialog).getByLabelText("Name")
    expect((nameInput as HTMLInputElement).value).toBe("expense-review")

    fireEvent.change(nameInput, { target: { value: "expense-review-v2" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(screen.getByText("expense-review-v2")).not.toBeNull()
    })
    expect(screen.queryByText("expense-review")).toBeNull()
    const updateCall = fetchMock.mock.calls[1]
    expect(updateCall[0]).toBe("/api/skills/1")
    expect(updateCall[1]?.method).toBe("PUT")
  })

  it("deletes a skill after confirming the dialog", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([ROW]))
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse([]))
    renderPanel()
    await waitFor(() => {
      expect(screen.getByText("expense-review")).not.toBeNull()
    })

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(screen.queryByText("expense-review")).toBeNull()
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/skills/1")
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE")
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/skills")
  })
})
