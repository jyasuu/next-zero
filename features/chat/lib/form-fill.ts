"use client"

import { formFillOutputSchema } from "@/features/chat/types"
import { useFormFillStore } from "@/stores/form-fill-store"

/**
 * Auto-applies a tool result to the page form when it is a valid form-fill
 * verdict and the auto-apply preference is on. Called at tool-execution time
 * (from the chat panel), never when rendering restored history, so enabling
 * auto-apply after a conversation has already run never retroactively fills
 * the form. Returns whether the result was applied.
 */
export function autoApplyFormFillResult(toolId: string, output: unknown): boolean {
  if (!useFormFillStore.getState().autoApplyWhenValid) return false
  const parsed = formFillOutputSchema.safeParse(output)
  if (!parsed.success || !parsed.data.valid) return false
  return useFormFillStore.getState().applyFormFill(toolId, parsed.data.values, { onlyIfEmpty: true })
}
