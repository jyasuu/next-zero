import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { Markdown } from "@/features/chat/components/markdown"

describe("Markdown", () => {
  it("renders bold, italic, lists, headings, and code fences", () => {
    const { container } = render(
      <Markdown
        text={
          "# Heading\n\n**bold** and *italic*\n\n- item one\n- item two\n\n```js\nconst x = 1\n```"
        }
      />
    )
    expect(screen.queryByRole("heading", { level: 1, name: "Heading" })).not.toBeNull()
    expect(screen.queryByText("bold", { selector: "strong" })).not.toBeNull()
    expect(screen.queryByText("italic", { selector: "em" })).not.toBeNull()
    expect(container.querySelectorAll("li").length).toBe(2)
    expect(container.querySelector("pre")).not.toBeNull()
  })

  it("renders GFM tables instead of literal pipe syntax", () => {
    render(
      <Markdown text={"| Name | Role |\n| --- | --- |\n| Ada | Admin |"} />
    )
    expect(screen.queryByText("| Name | Role |")).toBeNull()
    const table = screen.queryByRole("table")
    expect(table).not.toBeNull()
    if (table) {
      const rows = within(table as HTMLElement).getAllByRole("row")
      expect(rows.length).toBe(2)
      expect(within(rows[1] as HTMLElement).getByText("Ada")).not.toBeNull()
    }
  })

  it("renders GFM task lists", () => {
    render(<Markdown text={"- [x] done\n- [ ] pending"} />)
    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes.length).toBe(2)
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false)
  })

  it("renders GFM strikethrough", () => {
    render(<Markdown text={"~~gone~~"} />)
    expect(screen.queryByText("gone", { selector: "del" })).not.toBeNull()
  })

  it("does not surface raw markdown tokens", () => {
    render(<Markdown text={"**bold** and **not closed"} />)
    expect(screen.queryByText("**bold**")).toBeNull()
  })
})
