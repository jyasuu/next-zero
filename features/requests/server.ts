import type { Session } from "next-auth"
import { queryRow, run } from "@/lib/db"
import { ability } from "@/lib/acl"
import { getRoleWithPolicies } from "@/lib/roles"
import type { RequestRow, RequestsActor } from "@/features/requests/lib/visibility"
import type { RequestStatus } from "@/features/requests/lib/workflow"

export function parseRequestRow(row: Record<string, unknown>): RequestRow {
  return {
    id: String(row.id),
    requester_email: String(row.requester_email),
    title: String(row.title),
    access: String(row.access),
    justification: String(row.justification),
    status: row.status as RequestStatus,
    decided_by: row.decided_by === null ? null : String(row.decided_by),
    decision_comment: row.decision_comment === null ? null : String(row.decision_comment),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    decided_at: row.decided_at === null ? null : String(row.decided_at),
  }
}

export async function getRequestById(id: string): Promise<RequestRow | null> {
  const row = await queryRow("SELECT * FROM requests WHERE id = $1", [id])
  return row ? parseRequestRow(row) : null
}

export async function updateRequestStatus(id: string, status: RequestStatus): Promise<void> {
  await run("UPDATE requests SET status = $1, updated_at = $2 WHERE id = $3", [
    status,
    new Date().toISOString(),
    id,
  ])
}

export async function updateRequestDecision(
  id: string,
  status: RequestStatus,
  decidedBy: string,
  comment: string | null
): Promise<void> {
  const now = new Date().toISOString()
  const reopen = status === "pending"
  await run(
    "UPDATE requests SET status = $1, decided_by = $2, decided_at = $3, decision_comment = $4, updated_at = $5 WHERE id = $6",
    [status, reopen ? null : decidedBy, reopen ? null : now, reopen ? null : comment, now, id]
  )
}

export async function actorFromSession(session: Session | null): Promise<RequestsActor> {
  const role = await getRoleWithPolicies(session?.user.role ?? "")
  const { can } = ability(role ?? { permissions: [] }, session?.user.isAdmin ?? false)
  return {
    email: session?.user.email ?? "",
    isAdmin: session?.user.isAdmin ?? false,
    can,
  }
}
