import { NextResponse } from "next/server"
import { requireSession } from "@/features/chat/server/auth"
import { getOwnedSkillByName } from "@/features/skills/server"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const email = guard.session.user.email ?? ""

  const { name } = await params
  const skill = await getOwnedSkillByName(email, name)
  if (!skill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(skill)
}
