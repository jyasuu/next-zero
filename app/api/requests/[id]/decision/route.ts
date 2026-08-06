import { NextResponse } from "next/server"
import { requireApiVerb } from "@/lib/api-acl"
import { transitionStatus, type RequestAction } from "@/features/requests/lib/workflow"
import { getRequestById, updateRequestDecision } from "@/features/requests/server"

export const dynamic = "force-dynamic"

const DECISION_ACTIONS: RequestAction[] = ["approve", "reject", "reopen"]

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiVerb("Approve", "requests")
  if (!guard.ok) return guard.response

  const { id } = await params
  const existing = await getRequestById(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = body?.action as RequestAction | undefined
  if (!action || !DECISION_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const result = transitionStatus(existing.status, action)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }

  const comment =
    typeof body.comment === "string" && body.comment.trim() ? body.comment.trim() : null
  await updateRequestDecision(id, result.status, guard.session.user.email ?? "", comment)

  return NextResponse.json({ success: true, status: result.status })
}
