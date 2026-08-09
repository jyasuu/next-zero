import { NextResponse } from "next/server"
import { requireSession } from "@/features/chat/server/auth"
import { skillSchema } from "@/features/skills/lib/skill"
import { deleteOwnedSkill, skillNameTakenByOwner, updateOwnedSkill } from "@/features/skills/server"

export const dynamic = "force-dynamic"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const email = guard.session.user.email ?? ""

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = skillSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid skill", issues: parsed.error.flatten() }, { status: 400 })
  }

  if (await skillNameTakenByOwner(email, parsed.data.name, id)) {
    return NextResponse.json({ error: "A skill with this name already exists" }, { status: 409 })
  }

  const updated = await updateOwnedSkill(email, id, parsed.data)
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const email = guard.session.user.email ?? ""

  const { id } = await params
  const deleted = await deleteOwnedSkill(email, id)
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
