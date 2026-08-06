import type { RequestStatus } from "@/features/requests/lib/workflow"

export interface RequestRow {
  id: string
  requester_email: string
  title: string
  access: string
  justification: string
  status: RequestStatus
  decided_by: string | null
  decision_comment: string | null
  created_at: string
  updated_at: string
  decided_at: string | null
}

export interface RequestsActor {
  email: string
  isAdmin: boolean
  can: (action: string) => boolean
}

export function canReadRequests(actor: RequestsActor): boolean {
  return actor.isAdmin || actor.can("requests:Read")
}

export function canCreateRequest(actor: RequestsActor): boolean {
  return actor.isAdmin || actor.can("requests:Create")
}

export function canApproveRequest(actor: RequestsActor): boolean {
  return actor.isAdmin || actor.can("requests:Approve")
}

export function canSeeRequest(actor: RequestsActor, request: RequestRow): boolean {
  return canApproveRequest(actor) || request.requester_email === actor.email
}

export function canCancelRequest(actor: RequestsActor, request: RequestRow): boolean {
  return (
    canCreateRequest(actor) && request.requester_email === actor.email && request.status === "pending"
  )
}
