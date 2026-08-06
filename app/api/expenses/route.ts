import { NextResponse } from "next/server"
import { queryAll, run } from "@/lib/db"
import { requireApiAction, requireApiVerb } from "@/lib/api-acl"
import { expenseFormSchema } from "@/features/expenses/lib/form"
import { canApproveExpense, canReadExpenses } from "@/features/expenses/lib/visibility"
import { EXPENSE_STATUSES, type ExpenseStatus } from "@/features/expenses/lib/workflow"
import { actorFromSession, parseExpenseRow } from "@/features/expenses/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const guard = await requireApiAction("GET", "expenses")
  if (!guard.ok) return guard.response

  const actor = await actorFromSession(guard.session)
  if (!canReadExpenses(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const statusFilter = new URL(request.url).searchParams.get("status") as ExpenseStatus | null
  if (statusFilter && !EXPENSE_STATUSES.includes(statusFilter)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }
  const approver = canApproveExpense(actor)

  const rows = approver
    ? await queryAll("SELECT * FROM expenses ORDER BY created_at DESC")
    : await queryAll("SELECT * FROM expenses WHERE requester_email = $1 ORDER BY created_at DESC", [
        actor.email,
      ])

  const filtered = statusFilter
    ? rows.filter((row) => parseExpenseRow(row).status === statusFilter)
    : rows

  return NextResponse.json(filtered.map(parseExpenseRow))
}

export async function POST(request: Request) {
  const guard = await requireApiVerb("Create", "expenses")
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  const parsed = expenseFormSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const id = String(Date.now())
  const now = new Date().toISOString()
  await run(
    "INSERT INTO expenses (id, requester_email, title, amount, justification, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [id, guard.session.user.email ?? "", parsed.data.title, parsed.data.amount, parsed.data.justification, "pending", now, now]
  )
  const row = await queryAll("SELECT * FROM expenses WHERE id = $1", [id])
  return NextResponse.json(parseExpenseRow(row[0]), { status: 201 })
}
