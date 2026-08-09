import { NextResponse } from "next/server"
import { requireSession } from "@/features/chat/server/auth"
import { skillSchema } from "@/features/skills/lib/skill"
import { createSkill, getSkillsByOwner, skillNameTakenByOwner } from "@/features/skills/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const email = guard.session.user.email ?? ""
  return NextResponse.json(await getSkillsByOwner(email))
}

export async function POST(request: Request) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const email = guard.session.user.email ?? ""

  const body = await request.json().catch(() => null)
  const parsed = skillSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid skill", issues: parsed.error.flatten() }, { status: 400 })
  }

  if (await skillNameTakenByOwner(email, parsed.data.name)) {
    return NextResponse.json({ error: "A skill with this name already exists" }, { status: 409 })
  }

  const skill = await createSkill(email, parsed.data)
  return NextResponse.json(skill, { status: 201 })
}
