import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { auth } from "@/lib/auth"

export type RequireSessionResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse }

export async function requireSession(): Promise<RequireSessionResult> {
  const session = await auth()
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true, session }
}
