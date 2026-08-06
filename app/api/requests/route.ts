import { NextResponse } from "next/server"
import { queryAll, run } from "@/lib/db"
import { requireApiAction, requireApiVerb } from "@/lib/api-acl"
import { requestFormSchema } from "@/features/requests/lib/form"
import { canApproveRequest, canReadRequests } from "@/features/requests/lib/visibility"
import { REQUEST_STATUSES, type RequestStatus } from "@/features/requests/lib/workflow"
import { actorFromSession, parseRequestRow } from "@/features/requests/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const guard = await requireApiAction("GET", "requests")
  if (!guard.ok) return guard.response

  const actor = await actorFromSession(guard.session)
  if (!canReadRequests(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const statusFilter = new URL(request.url).searchParams.get("status") as RequestStatus | null
  if (statusFilter && !REQUEST_STATUSES.includes(statusFilter)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }
  const approver = canApproveRequest(actor)

  const rows = approver
    ? await queryAll(
        "SELECT * FROM requests ORDER BY created_at DESC"
      )
    : await queryAll(
        "SELECT * FROM requests WHERE requester_email = $1 ORDER BY created_at DESC",
        [actor.email]
      )

  const filtered = statusFilter
    ? rows.filter((row) => parseRequestRow(row).status === statusFilter)
    : rows

  return NextResponse.json(filtered.map(parseRequestRow))
}

export async function POST(request: Request) {
  const guard = await requireApiVerb("Create", "requests")
  if (!guard.ok) return guard.response

  const body = await request.json().catch(() => null)
  const parsed = requestFormSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const id = String(Date.now())
  const now = new Date().toISOString()
  await run(
    "INSERT INTO requests (id, requester_email, title, access, justification, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [id, guard.session.user.email ?? "", parsed.data.title, parsed.data.access, parsed.data.justification, "pending", now, now]
  )
  const row = await queryAll("SELECT * FROM requests WHERE id = $1", [id])
  return NextResponse.json(parseRequestRow(row[0]), { status: 201 })
}
