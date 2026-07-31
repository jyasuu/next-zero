import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ability } from "@/lib/acl"
import { getRoleWithPolicies } from "@/lib/roles"

const ACTION_BY_METHOD: Record<string, string> = {
  GET: "Read",
  POST: "Create",
  PUT: "Write",
  DELETE: "Delete",
}

export type ApiAuthResult = { ok: true } | { ok: false; response: NextResponse }

export async function requireApiAction(method: string, domain: string): Promise<ApiAuthResult> {
  const session = await auth()
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  if (session.user.isAdmin) return { ok: true }

  const role = await getRoleWithPolicies(session.user.role ?? "")
  const { can } = ability(role ?? { permissions: [] }, false)
  const verb = ACTION_BY_METHOD[method] ?? "Read"
  if (!can(`${domain}:${verb}`)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true }
}
