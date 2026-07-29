import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "../button"

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText("Click me")).toBeDefined()
  })

  it("applies default variant classes", () => {
    render(<Button>Default</Button>)
    const button = screen.getByText("Default")
    expect(button.className).toContain("bg-primary")
  })

  it("applies outline variant", () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByText("Outline")
    expect(button.className).toContain("border-input")
  })

  it("renders as disabled", () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByText("Disabled") as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })
})
