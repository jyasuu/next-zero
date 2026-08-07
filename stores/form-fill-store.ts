"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type FormValues = Record<string, string>
export type ApplyFormHandler = (values: FormValues) => void

interface FormFillState {
  handlers: Record<string, ApplyFormHandler>
  hasAnyApplyHandler: boolean
  autoApplyWhenValid: boolean
  registerApplyHandler: (toolId: string, handler: ApplyFormHandler) => () => void
  hasApplyHandler: (toolId: string) => boolean
  applyFormFill: (toolId: string, values: FormValues) => boolean
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
      applyFormFill: (toolId, values) => {
        const handler = get().handlers[toolId]
        if (!handler) return false
        handler(values)
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
