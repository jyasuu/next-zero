import type { Session } from "next-auth"
import { queryRow, run } from "@/lib/db"
import { ability } from "@/lib/acl"
import { getRoleWithPolicies } from "@/lib/roles"
import type { ExpenseRow, ExpensesActor } from "@/features/expenses/lib/visibility"
import type { ExpenseStatus } from "@/features/expenses/lib/workflow"

export function parseExpenseRow(row: Record<string, unknown>): ExpenseRow {
  return {
    id: String(row.id),
    requester_email: String(row.requester_email),
    title: String(row.title),
    amount: String(row.amount),
    justification: String(row.justification),
    status: row.status as ExpenseStatus,
    decided_by: row.decided_by === null ? null : String(row.decided_by),
    decision_comment: row.decision_comment === null ? null : String(row.decision_comment),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    decided_at: row.decided_at === null ? null : String(row.decided_at),
  }
}

export async function getExpenseById(id: string): Promise<ExpenseRow | null> {
  const row = await queryRow("SELECT * FROM expenses WHERE id = $1", [id])
  return row ? parseExpenseRow(row) : null
}

export async function updateExpenseStatus(id: string, status: ExpenseStatus): Promise<void> {
  await run("UPDATE expenses SET status = $1, updated_at = $2 WHERE id = $3", [
    status,
    new Date().toISOString(),
    id,
  ])
}

export async function updateExpenseDecision(
  id: string,
  status: ExpenseStatus,
  decidedBy: string,
  comment: string | null
): Promise<void> {
  const now = new Date().toISOString()
  const reopen = status === "pending"
  await run(
    "UPDATE expenses SET status = $1, decided_by = $2, decided_at = $3, decision_comment = $4, updated_at = $5 WHERE id = $6",
    [status, reopen ? null : decidedBy, reopen ? null : now, reopen ? null : comment, now, id]
  )
}

export async function actorFromSession(session: Session | null): Promise<ExpensesActor> {
  const role = await getRoleWithPolicies(session?.user.role ?? "")
  const { can } = ability(role ?? { permissions: [] }, session?.user.isAdmin ?? false)
  return {
    email: session?.user.email ?? "",
    isAdmin: session?.user.isAdmin ?? false,
    can,
  }
}
