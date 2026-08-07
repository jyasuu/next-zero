"use client"

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type FormValues = Record<string, string>

export interface ApplyOptions {
  onlyIfEmpty?: boolean
}

export type ApplyFormHandler = (values: FormValues, options: ApplyOptions) => void

interface FormFillState {
  handlers: Record<string, ApplyFormHandler>
  hasAnyApplyHandler: boolean
  autoApplyWhenValid: boolean
  registerApplyHandler: (toolId: string, handler: ApplyFormHandler) => () => void
  hasApplyHandler: (toolId: string) => boolean
  applyFormFill: (toolId: string, values: FormValues, options?: ApplyOptions) => boolean
  setAutoApplyWhenValid: (enabled: boolean) => void
}

export const useFormFillStore = create<FormFillState>()(
  persist(
    (set, get) => ({
      handlers: {},
      hasAnyApplyHandler: false,
      autoApplyWhenValid: false,
      registerApplyHandler: (toolId, handler) => {
        set((state) => ({ handlers: { ...state.handlers, [toolId]: handler }, hasAnyApplyHandler: true }))
        return () => {
          set((state) => {
            const rest: Record<string, ApplyFormHandler> = { ...state.handlers }
            delete rest[toolId]
            return { handlers: rest, hasAnyApplyHandler: Object.keys(rest).length > 0 }
          })
        }
      },
      hasApplyHandler: (toolId) => toolId in get().handlers,
      applyFormFill: (toolId, values, options) => {
        const handler = get().handlers[toolId]
        if (!handler) return false
        handler(values, options ?? {})
        return true
      },
      setAutoApplyWhenValid: (enabled) => set({ autoApplyWhenValid: enabled }),
    }),
    {
      name: "form-fill-store",
      partialize: (state) => ({ autoApplyWhenValid: state.autoApplyWhenValid }),
    }
  )
)

/**
 * Registers an apply handler for a page's form-fill tool. Handlers merge the
 * proposed values into the page's form state and clear inline errors. When
 * applied in `onlyIfEmpty` mode (the auto-apply path), the handler leaves the
 * form untouched if any field already has content, so restored chat history
 * never clobbers what the user typed. The explicit "Apply to form" button
 * always applies.
 */
export function useRegisterFormFillApply<S extends Record<string, string>>(
  toolId: string,
  form: S,
  setForm: Dispatch<SetStateAction<S>>,
  setFormErrors: (errors: Record<string, never>) => void
): void {
  const latest = useRef({ form, setForm, setFormErrors })

  useEffect(() => {
    latest.current = { form, setForm, setFormErrors }
  })

  useEffect(() => {
    return useFormFillStore.getState().registerApplyHandler(toolId, (values, options) => {
      const { form: currentForm, setForm: applyForm, setFormErrors: clearErrors } = latest.current
      const alreadyFilled = Object.values(currentForm).some((value) => value.trim() !== "")
      if (options.onlyIfEmpty && alreadyFilled) return
      applyForm((prev) => ({ ...prev, ...values }))
      clearErrors({})
    })
  }, [toolId])
}
