import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useFormFillStore, useRegisterFormFillApply } from "../form-fill-store"

describe("useRegisterFormFillApply", () => {
  beforeEach(() => {
    useFormFillStore.setState({ handlers: {}, hasAnyApplyHandler: false, autoApplyWhenValid: false })
  })

  function setup(initial = { title: "", access: "", justification: "" }) {
    const setErrors = vi.fn()
    const { result, unmount } = renderHook(() => {
      const [form, setForm] = useState(initial)
      useRegisterFormFillApply("requests_form_fill", form, setForm, setErrors)
      return form
    })
    return { result, unmount, setErrors }
  }

  it("applies values to an empty form and clears errors", () => {
    const { result, setErrors } = setup()
    act(() => {
      useFormFillStore.getState().applyFormFill("requests_form_fill", { title: "DB access", access: "prod" })
    })
    expect(result.current).toEqual({ title: "DB access", access: "prod", justification: "" })
    expect(setErrors).toHaveBeenCalledWith({})
  })

  it("applies over a non-empty form when not flagged onlyIfEmpty (explicit button)", () => {
    const { result, setErrors } = setup({ title: "Existing", access: "", justification: "" })
    act(() => {
      useFormFillStore.getState().applyFormFill("requests_form_fill", { title: "DB access", access: "prod" })
    })
    expect(result.current.title).toBe("DB access")
    expect(setErrors).toHaveBeenCalledWith({})
  })

  it("leaves a non-empty form untouched when applying with onlyIfEmpty", () => {
    const { result, setErrors } = setup({ title: "Existing", access: "", justification: "" })
    act(() => {
      useFormFillStore.getState().applyFormFill("requests_form_fill", { title: "DB access" }, { onlyIfEmpty: true })
    })
    expect(result.current.title).toBe("Existing")
    expect(result.current.access).toBe("")
    expect(setErrors).not.toHaveBeenCalled()
  })

  it("applies to an empty form even with onlyIfEmpty", () => {
    const { result } = setup()
    act(() => {
      useFormFillStore.getState().applyFormFill("requests_form_fill", { title: "DB access" }, { onlyIfEmpty: true })
    })
    expect(result.current.title).toBe("DB access")
  })

  it("unregisters the handler on unmount", () => {
    const { unmount } = setup()
    expect(useFormFillStore.getState().hasApplyHandler("requests_form_fill")).toBe(true)
    unmount()
    expect(useFormFillStore.getState().hasApplyHandler("requests_form_fill")).toBe(false)
  })
})
