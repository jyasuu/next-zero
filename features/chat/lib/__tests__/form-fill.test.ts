import { describe, it, expect, vi, beforeEach } from "vitest"
import { autoApplyFormFillResult } from "@/features/chat/lib/form-fill"
import { useFormFillStore } from "@/stores/form-fill-store"

describe("autoApplyFormFillResult", () => {
  beforeEach(() => {
    useFormFillStore.setState({ handlers: {}, hasAnyApplyHandler: false, autoApplyWhenValid: false })
  })

  const validVerdict = { valid: true, values: { title: "DB access", access: "prod" }, errors: {} }

  it("applies a valid verdict when auto-apply is enabled and a handler is registered", () => {
    const handler = vi.fn()
    useFormFillStore.getState().setAutoApplyWhenValid(true)
    useFormFillStore.getState().registerApplyHandler("requests_form_fill", handler)
    const applied = autoApplyFormFillResult("requests_form_fill", validVerdict)
    expect(applied).toBe(true)
    expect(handler).toHaveBeenCalledWith({ title: "DB access", access: "prod" }, { onlyIfEmpty: true })
  })

  it("does nothing when auto-apply is disabled", () => {
    const handler = vi.fn()
    useFormFillStore.getState().registerApplyHandler("requests_form_fill", handler)
    const applied = autoApplyFormFillResult("requests_form_fill", validVerdict)
    expect(applied).toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it("does nothing for an invalid verdict", () => {
    const handler = vi.fn()
    useFormFillStore.getState().setAutoApplyWhenValid(true)
    useFormFillStore.getState().registerApplyHandler("requests_form_fill", handler)
    const applied = autoApplyFormFillResult("requests_form_fill", {
      valid: false,
      values: { title: "x" },
      errors: { title: "required" },
    })
    expect(applied).toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it("does nothing for output that is not a form-fill verdict", () => {
    const handler = vi.fn()
    useFormFillStore.getState().setAutoApplyWhenValid(true)
    useFormFillStore.getState().registerApplyHandler("requests_form_fill", handler)
    const applied = autoApplyFormFillResult("requests_form_fill", { rows: [] })
    expect(applied).toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })
})
