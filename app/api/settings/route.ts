import { NextResponse } from "next/server"
import { requireSession } from "@/features/chat/server/auth"
import { getCustomPrompt, setCustomPrompt } from "@/features/chat/server/settings"

export const dynamic = "force-dynamic"

export async function GET() {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  return NextResponse.json({ customPrompt: await getCustomPrompt(guard.session.user.email ?? "") })
}

export async function PUT(request: Request) {
  const guard = await requireSession()
  if (!guard.ok) return guard.response
  const body = await request.json().catch(() => null)
  const customPrompt = typeof body?.customPrompt === "string" ? body.customPrompt.slice(0, 4000) : ""
  await setCustomPrompt(guard.session.user.email ?? "", customPrompt)
  return NextResponse.json({ customPrompt })
}
