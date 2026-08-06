import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { auth } from "@/lib/auth"
import { ability } from "@/lib/acl"
import { getRoleWithPolicies } from "@/lib/roles"

const ACTION_BY_METHOD: Record<string, string> = {
  GET: "Read",
  POST: "Create",
  PUT: "Write",
  DELETE: "Delete",
}

export type ApiAuthResult = { ok: true; session: Session } | { ok: false; response: NextResponse }

export async function requireApiAction(method: string, domain: string): Promise<ApiAuthResult> {
  return requireApiVerb(ACTION_BY_METHOD[method] ?? "Read", domain)
}

export async function requireApiVerb(verb: string, domain: string): Promise<ApiAuthResult> {
  const session = await auth()
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  if (session.user.isAdmin) return { ok: true, session }

  const role = await getRoleWithPolicies(session.user.role ?? "")
  const { can } = ability(role ?? { permissions: [] }, false)
  if (!can(`${domain}:${verb}`)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true, session }
}
