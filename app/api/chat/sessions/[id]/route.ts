import { NextResponse } from "next/server"
import { requireSession } from "@/features/chat/server/auth"
import { softDeleteSession } from "@/features/chat/server/sessions"

export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const { id } = await params
  const deleted = await softDeleteSession(guard.session.user.email ?? "", id)
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
