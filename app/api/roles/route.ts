import { NextResponse } from "next/server"
import { queryAll, run } from "@/lib/db"
import { requireApiAction } from "@/lib/api-acl"

function parseRole(row: Record<string, unknown>) {
  return {
    ...row,
    permissions: JSON.parse(row.permissions as string),
    policies: JSON.parse(row.policies as string),
  }
}

export async function GET() {
  const authResult = await requireApiAction("GET", "roles")
  if (!authResult.ok) return authResult.response

  const rows = await queryAll("SELECT * FROM roles ORDER BY user_count DESC")
  return NextResponse.json(rows.map(parseRole))
}

export async function POST(request: Request) {
  const authResult = await requireApiAction("POST", "roles")
  if (!authResult.ok) return authResult.response

  const body = await request.json()
  const id = String(Date.now())
  const permissions = JSON.stringify(body.permissions || [])
  const policies = JSON.stringify(body.policies || [])
  await run(
    "INSERT INTO roles (id, name, description, permissions, policies, user_count) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, body.name, body.description || "", permissions, policies, body.user_count || 0]
  )
  const row = (await queryAll("SELECT * FROM roles WHERE id = $1", [id]))[0]
  return NextResponse.json(parseRole(row), { status: 201 })
}
