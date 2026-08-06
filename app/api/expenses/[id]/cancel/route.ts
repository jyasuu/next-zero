import { NextResponse } from "next/server"
import { requireApiVerb } from "@/lib/api-acl"
import { canCancelExpense } from "@/features/expenses/lib/visibility"
import { transitionStatus } from "@/features/expenses/lib/workflow"
import { actorFromSession, getExpenseById, updateExpenseStatus } from "@/features/expenses/server"

export const dynamic = "force-dynamic"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiVerb("Create", "expenses")
  if (!guard.ok) return guard.response

  const { id } = await params
  const existing = await getExpenseById(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const actor = await actorFromSession(guard.session)
  if (!canCancelExpense(actor, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = transitionStatus(existing.status, "cancel")
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }

  await updateExpenseStatus(id, result.status)

  return NextResponse.json({ success: true, status: result.status })
}
