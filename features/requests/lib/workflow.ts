export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled"

export type RequestAction = "approve" | "reject" | "reopen" | "cancel"

export const REQUEST_STATUSES: RequestStatus[] = ["pending", "approved", "rejected", "cancelled"]

const TRANSITIONS: Record<RequestStatus, Partial<Record<RequestAction, RequestStatus>>> = {
  pending: { approve: "approved", reject: "rejected", cancel: "cancelled" },
  rejected: { reopen: "pending" },
  approved: {},
  cancelled: {},
}

export type TransitionResult = { ok: true; status: RequestStatus } | { ok: false; error: string }

export function transitionStatus(status: RequestStatus, action: RequestAction): TransitionResult {
  const next = TRANSITIONS[status]?.[action]
  if (!next) {
    return { ok: false, error: `Cannot ${action} a ${status} request` }
  }
  return { ok: true, status: next }
}
