import { describe, it, expect, beforeEach } from "vitest"
import { useUIStore } from "../ui-store"

describe("uiStore", () => {
  beforeEach(() => {
    useUIStore.setState({ sidebarCollapsed: false, theme: "system" })
  })

  it("starts with sidebar expanded", () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })

  it("toggles sidebar collapsed state", () => {
    useUIStore.getState().sidebarCollapsedChanged(true)
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
  })

  it("expands sidebar", () => {
    useUIStore.getState().sidebarCollapsedChanged(true)
    useUIStore.getState().sidebarCollapsedChanged(false)
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })

  it("sets theme", () => {
    useUIStore.getState().setTheme("dark")
    expect(useUIStore.getState().theme).toBe("dark")
  })

  it("sets theme to light", () => {
    useUIStore.getState().setTheme("light")
    expect(useUIStore.getState().theme).toBe("light")
  })
})
