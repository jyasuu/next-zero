import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCustomPrompt, setCustomPrompt } from "@/features/chat/server/settings"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json({ customPrompt: await getCustomPrompt(session.user.email ?? "") })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const customPrompt = typeof body?.customPrompt === "string" ? body.customPrompt.slice(0, 4000) : ""
  await setCustomPrompt(session.user.email ?? "", customPrompt)
  return NextResponse.json({ customPrompt })
}
