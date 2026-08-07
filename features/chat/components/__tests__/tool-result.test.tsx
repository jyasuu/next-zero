import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within, fireEvent } from "@testing-library/react"
import { ToolResult } from "@/features/chat/components/tool-result"
import { useFormFillStore } from "@/stores/form-fill-store"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

beforeEach(() => {
  useFormFillStore.setState({ handlers: {}, hasAnyApplyHandler: false, autoApplyWhenValid: false })
})

const WHOAMI = { email: "admin@localhost", role: "Admin", isAdmin: true }
const USERS = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com", role: "Admin", status: "active", created_at: "2026-01-01" },
  { id: "2", name: "Grace Hopper", email: "grace@example.com", role: "Viewer", status: "inactive", created_at: "2026-02-01" },
]

describe("ToolResult", () => {
  describe("account_whoami", () => {
    it("renders a profile card instead of raw JSON", () => {
      render(<ToolResult toolId="account_whoami" output={WHOAMI} />)
      expect(screen.queryByText(/"email":/)).toBeNull()
      expect(screen.getByText("admin@localhost")).not.toBeNull()
      expect(screen.getByText("Admin")).not.toBeNull()
      expect(screen.getByText("Administrator")).not.toBeNull()
    })

    it("shows a Member badge for non-admin output", () => {
      render(<ToolResult toolId="account_whoami" output={{ email: "viewer@example.com", role: "Viewer", isAdmin: false }} />)
      expect(screen.getByText("Member")).not.toBeNull()
      expect(screen.queryByText("Administrator")).toBeNull()
    })
  })

  describe("users_list", () => {
    it("renders a table with formatted columns", () => {
      render(<ToolResult toolId="users_list" output={USERS} />)
      const table = screen.getByRole("table")
      const rows = within(table).getAllByRole("row")
      expect(rows.length).toBe(3)
      expect(within(rows[0]).getByText("Name")).not.toBeNull()
      expect(within(rows[1]).getByText("Ada Lovelace")).not.toBeNull()
      expect(within(rows[1]).getByText("ada@example.com")).not.toBeNull()
      expect(within(rows[2]).getByText("Grace Hopper")).not.toBeNull()
    })

    it("renders status values as badges", () => {
      render(<ToolResult toolId="users_list" output={USERS} />)
      expect(screen.getAllByText("active").length).toBe(1)
      expect(screen.getAllByText("inactive").length).toBe(1)
    })

    it("shows an empty state for an empty array", () => {
      render(<ToolResult toolId="users_list" output={[]} />)
      expect(screen.getByText("No results.")).not.toBeNull()
    })
  })

  describe("users_get / users_create / users_update", () => {
    it("renders a user detail card", () => {
      render(<ToolResult toolId="users_get" output={USERS[0]} />)
      expect(screen.getByText("Ada Lovelace")).not.toBeNull()
      expect(screen.getByText("ada@example.com")).not.toBeNull()
      expect(screen.getByText("Admin")).not.toBeNull()
      expect(screen.getByText("active")).not.toBeNull()
    })

    it("unwraps an { ok, data } envelope", () => {
      render(<ToolResult toolId="users_get" output={{ ok: true, data: USERS[0] }} />)
      expect(screen.getByText("Ada Lovelace")).not.toBeNull()
    })
  })

  describe("users_delete", () => {
    it("renders a confirmation instead of raw JSON", () => {
      render(<ToolResult toolId="users_delete" output={{ success: true }} />)
      expect(screen.queryByText(/"success":/)).toBeNull()
      expect(screen.getByText("User deleted.")).not.toBeNull()
    })
  })

  describe("expenses_form_fill / requests_form_fill", () => {
    it("renders a valid verdict with the filled values", () => {
      render(
        <ToolResult
          toolId="expenses_form_fill"
          output={{ valid: true, values: { title: "Team lunch", amount: "42.50" }, errors: {} }}
        />
      )
      expect(screen.getByText("formFill.valid")).not.toBeNull()
      expect(screen.getByText("Team lunch")).not.toBeNull()
      expect(screen.getByText("42.50")).not.toBeNull()
      expect(screen.queryByText("formFill.invalid")).toBeNull()
    })

    it("renders an invalid verdict with per-field errors", () => {
      render(
        <ToolResult
          toolId="requests_form_fill"
          output={{ valid: false, values: { title: "", access: "prod" }, errors: { title: "title is required" } }}
        />
      )
      expect(screen.getByText("formFill.invalid")).not.toBeNull()
      expect(screen.getByText("title is required")).not.toBeNull()
      expect(screen.queryByText("formFill.noErrors")).toBeNull()
    })

    it("unwraps an { ok, data } envelope", () => {
      render(
        <ToolResult
          toolId="expenses_form_fill"
          output={{ ok: true, data: { valid: true, values: { amount: "1.00" }, errors: {} } }}
        />
      )
      expect(screen.getByText("formFill.valid")).not.toBeNull()
    })

    it("renders an Apply to form button and applies the values on click", () => {
      const handler = vi.fn()
      useFormFillStore.getState().registerApplyHandler("expenses_form_fill", handler)
      render(
        <ToolResult
          toolId="expenses_form_fill"
          output={{ valid: false, values: { title: "Team lunch", amount: "mock-amount" }, errors: { amount: "amount is invalid" } }}
        />
      )
      const applyButton = screen.getByRole("button", { name: "formFill.apply" })
      fireEvent.click(applyButton)
      expect(handler).toHaveBeenCalledWith({ title: "Team lunch", amount: "mock-amount" }, {})
    })

    it("hides the Apply to form button when no apply handler is registered", () => {
      render(
        <ToolResult
          toolId="expenses_form_fill"
          output={{ valid: true, values: { title: "Team lunch" }, errors: {} }}
        />
      )
      expect(screen.queryByRole("button", { name: "formFill.apply" })).toBeNull()
    })

    it("auto-applies a valid verdict when the preference is enabled", () => {
      const handler = vi.fn()
      useFormFillStore.getState().setAutoApplyWhenValid(true)
      useFormFillStore.getState().registerApplyHandler("requests_form_fill", handler)
      render(
        <ToolResult
          toolId="requests_form_fill"
          output={{ valid: true, values: { title: "DB access", access: "prod" }, errors: {} }}
        />
      )
      expect(handler).toHaveBeenCalledWith({ title: "DB access", access: "prod" }, { onlyIfEmpty: true })
    })

    it("does not auto-apply an invalid verdict even when the preference is enabled", () => {
      const handler = vi.fn()
      useFormFillStore.getState().setAutoApplyWhenValid(true)
      useFormFillStore.getState().registerApplyHandler("expenses_form_fill", handler)
      render(
        <ToolResult
          toolId="expenses_form_fill"
          output={{ valid: false, values: { title: "x", amount: "mock-amount" }, errors: { amount: "amount is invalid" } }}
        />
      )
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe("generic fallbacks", () => {
    it("renders a key/value grid for unknown plain-object tools", () => {
      render(<ToolResult toolId="unknown_tool" output={{ name: "Widget", count: 3, enabled: true }} />)
      expect(screen.getByText("Name")).not.toBeNull()
      expect(screen.getByText("Widget")).not.toBeNull()
      expect(screen.getByText("Enabled")).not.toBeNull()
      expect(screen.getByText("Yes")).not.toBeNull()
    })

    it("renders an auto table for unknown array-of-objects tools", () => {
      render(<ToolResult toolId="unknown_tool" output={[{ foo: "a" }, { foo: "b" }]} />)
      const rows = screen.getAllByRole("row")
      expect(rows.length).toBe(3)
      expect(screen.getByText("a")).not.toBeNull()
      expect(screen.getByText("b")).not.toBeNull()
    })

    it("renders plain text for string output", () => {
      render(<ToolResult toolId="unknown_tool" output="all good" />)
      expect(screen.getByText("all good")).not.toBeNull()
    })

    it("renders nothing for empty output", () => {
      const { container } = render(<ToolResult toolId="unknown_tool" output={null} />)
      expect(container.textContent).toBe("")
    })
  })

  describe("defensive fallback for known tools", () => {
    it("falls back to the generic view when a known tool's output does not match", () => {
      render(<ToolResult toolId="users_get" output="oops" />)
      expect(screen.getByText("oops")).not.toBeNull()
    })

    it("renders no raw JSON and does not crash on a malformed known-tool output", () => {
      const { container } = render(<ToolResult toolId="account_whoami" output={{ email: "x@y.z" }} />)
      expect(container.textContent).not.toContain('"email"')
      expect(container.textContent).not.toContain('"isAdmin"')
    })

    it("falls back when a delete result is missing its success flag", () => {
      const { container } = render(<ToolResult toolId="users_delete" output={{ done: true }} />)
      expect(screen.queryByText("User deleted.")).toBeNull()
      expect(container.textContent).toContain("Done")
    })
  })
})
