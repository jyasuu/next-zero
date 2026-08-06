import { NextResponse } from "next/server"
import { requireApiVerb } from "@/lib/api-acl"
import { canCancelRequest } from "@/features/requests/lib/visibility"
import { transitionStatus } from "@/features/requests/lib/workflow"
import { actorFromSession, getRequestById, updateRequestStatus } from "@/features/requests/server"

export const dynamic = "force-dynamic"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiVerb("Create", "requests")
  if (!guard.ok) return guard.response

  const { id } = await params
  const existing = await getRequestById(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const actor = await actorFromSession(guard.session)
  if (!canCancelRequest(actor, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = transitionStatus(existing.status, "cancel")
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }

  await updateRequestStatus(id, result.status)

  return NextResponse.json({ success: true, status: result.status })
}
