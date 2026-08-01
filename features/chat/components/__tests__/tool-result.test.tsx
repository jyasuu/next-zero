import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { ToolResult } from "@/features/chat/components/tool-result"

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
