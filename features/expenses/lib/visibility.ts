import type { ExpenseStatus } from "@/features/expenses/lib/workflow"

export interface ExpenseRow {
  id: string
  requester_email: string
  title: string
  amount: string
  justification: string
  status: ExpenseStatus
  decided_by: string | null
  decision_comment: string | null
  created_at: string
  updated_at: string
  decided_at: string | null
}

export interface ExpensesActor {
  email: string
  isAdmin: boolean
  can: (action: string) => boolean
}

export function canReadExpenses(actor: ExpensesActor): boolean {
  return actor.isAdmin || actor.can("expenses:Read")
}

export function canCreateExpense(actor: ExpensesActor): boolean {
  return actor.isAdmin || actor.can("expenses:Create")
}

export function canApproveExpense(actor: ExpensesActor): boolean {
  return actor.isAdmin || actor.can("expenses:Approve")
}

export function canSeeExpense(actor: ExpensesActor, expense: ExpenseRow): boolean {
  return canApproveExpense(actor) || expense.requester_email === actor.email
}

export function canCancelExpense(actor: ExpensesActor, expense: ExpenseRow): boolean {
  return (
    canCreateExpense(actor) && expense.requester_email === actor.email && expense.status === "pending"
  )
}
