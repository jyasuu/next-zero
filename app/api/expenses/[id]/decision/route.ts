import { NextResponse } from "next/server"
import { requireApiVerb } from "@/lib/api-acl"
import { transitionStatus, type ExpenseAction } from "@/features/expenses/lib/workflow"
import { getExpenseById, updateExpenseDecision } from "@/features/expenses/server"

export const dynamic = "force-dynamic"

const DECISION_ACTIONS: ExpenseAction[] = ["approve", "reject", "reopen"]

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiVerb("Approve", "expenses")
  if (!guard.ok) return guard.response

  const { id } = await params
  const existing = await getExpenseById(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = body?.action as ExpenseAction | undefined
  if (!action || !DECISION_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const result = transitionStatus(existing.status, action)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }

  const comment =
    typeof body.comment === "string" && body.comment.trim() ? body.comment.trim() : null
  await updateExpenseDecision(id, result.status, guard.session.user.email ?? "", comment)

  return NextResponse.json({ success: true, status: result.status })
}
