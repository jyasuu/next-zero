export type ExpenseStatus = "pending" | "approved" | "rejected" | "cancelled"

export type ExpenseAction = "approve" | "reject" | "reopen" | "cancel"

export const EXPENSE_STATUSES: ExpenseStatus[] = ["pending", "approved", "rejected", "cancelled"]

const TRANSITIONS: Record<ExpenseStatus, Partial<Record<ExpenseAction, ExpenseStatus>>> = {
  pending: { approve: "approved", reject: "rejected", cancel: "cancelled" },
  rejected: { reopen: "pending" },
  approved: {},
  cancelled: {},
}

export type TransitionResult = { ok: true; status: ExpenseStatus } | { ok: false; error: string }

export function transitionStatus(status: ExpenseStatus, action: ExpenseAction): TransitionResult {
  const next = TRANSITIONS[status]?.[action]
  if (!next) {
    return { ok: false, error: `Cannot ${action} a ${status} expense` }
  }
  return { ok: true, status: next }
}
