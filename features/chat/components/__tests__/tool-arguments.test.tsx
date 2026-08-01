import React from "react"
import { describe, it, expect } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ToolArguments } from "@/features/chat/components/tool-arguments"

describe("ToolArguments", () => {
  it("renders nothing when there are no arguments", () => {
    const undefinedContainer = render(<ToolArguments input={undefined} />)
    expect(undefinedContainer.container.textContent).toBe("")
    const emptyObjectContainer = render(<ToolArguments input={{}} />)
    expect(emptyObjectContainer.container.textContent).toBe("")
  })

  it("renders structured arguments as labeled fields, not raw JSON", () => {
    const { container } = render(
      <ToolArguments input={{ name: "Ada", email: "ada@example.com", role: "Admin" }} />
    )
    expect(screen.getByText("Name")).not.toBeNull()
    expect(screen.getByText("Ada")).not.toBeNull()
    expect(screen.getByText("ada@example.com")).not.toBeNull()
    expect(container.textContent).not.toContain('"name"')
  })

  it("keeps raw JSON collapsed behind a toggle", () => {
    render(<ToolArguments input={{ name: "Ada" }} />)
    expect(screen.queryByText(/"name"/)).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /show details/i }))
    expect(screen.getByText(/"name"/)).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /hide details/i }))
    expect(screen.queryByText(/"name"/)).toBeNull()
  })

  it("renders a plain-text argument as plain text", () => {
    render(<ToolArguments input="abc-123" />)
    expect(screen.getByText("abc-123")).not.toBeNull()
  })

  it("parses a JSON-string argument before rendering", () => {
    render(<ToolArguments input={JSON.stringify({ id: "abc" })} />)
    expect(screen.getByText("ID")).not.toBeNull()
    expect(screen.getByText("abc")).not.toBeNull()
  })

  it("renders an array of objects as labeled fields, not [object Object]", () => {
    render(<ToolArguments input={[{ id: "a", role: "Admin" }, { id: "b", role: "Viewer" }]} />)
    expect(screen.queryByText("[object Object]")).toBeNull()
    expect(screen.getAllByText("a").length).toBe(1)
    expect(screen.getAllByText("b").length).toBe(1)
  })
})
