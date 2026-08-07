import { describe, it, expect, vi, beforeEach } from "vitest"
import { useFormFillStore } from "../form-fill-store"

describe("formFillStore", () => {
  beforeEach(() => {
    useFormFillStore.setState({ handlers: {}, hasAnyApplyHandler: false, autoApplyWhenValid: false })
  })

  it("starts with auto-apply disabled and no handlers", () => {
    expect(useFormFillStore.getState().autoApplyWhenValid).toBe(false)
    expect(useFormFillStore.getState().hasAnyApplyHandler).toBe(false)
  })

  it("reports whether an apply handler exists for a tool id", () => {
    const unregister = useFormFillStore.getState().registerApplyHandler("expenses_form_fill", () => {})
    expect(useFormFillStore.getState().hasApplyHandler("expenses_form_fill")).toBe(true)
    expect(useFormFillStore.getState().hasApplyHandler("requests_form_fill")).toBe(false)
    expect(useFormFillStore.getState().hasAnyApplyHandler).toBe(true)
    unregister()
    expect(useFormFillStore.getState().hasApplyHandler("expenses_form_fill")).toBe(false)
    expect(useFormFillStore.getState().hasAnyApplyHandler).toBe(false)
  })

  it("dispatches applied values to the registered handler and returns true", () => {
    const handler = vi.fn()
    useFormFillStore.getState().registerApplyHandler("expenses_form_fill", handler)
    const applied = useFormFillStore.getState().applyFormFill("expenses_form_fill", { title: "Team lunch" })
    expect(applied).toBe(true)
    expect(handler).toHaveBeenCalledWith({ title: "Team lunch" })
  })

  it("returns false and does not throw when no handler is registered", () => {
    const applied = useFormFillStore.getState().applyFormFill("expenses_form_fill", { title: "x" })
    expect(applied).toBe(false)
  })

  it("supports multiple tool ids independently", () => {
    const expensesHandler = vi.fn()
    const requestsHandler = vi.fn()
    useFormFillStore.getState().registerApplyHandler("expenses_form_fill", expensesHandler)
    useFormFillStore.getState().registerApplyHandler("requests_form_fill", requestsHandler)
    useFormFillStore.getState().applyFormFill("requests_form_fill", { title: "DB access" })
    expect(requestsHandler).toHaveBeenCalledWith({ title: "DB access" })
    expect(expensesHandler).not.toHaveBeenCalled()
  })

  it("toggles the auto-apply preference", () => {
    useFormFillStore.getState().setAutoApplyWhenValid(true)
    expect(useFormFillStore.getState().autoApplyWhenValid).toBe(true)
    useFormFillStore.getState().setAutoApplyWhenValid(false)
    expect(useFormFillStore.getState().autoApplyWhenValid).toBe(false)
  })
})
