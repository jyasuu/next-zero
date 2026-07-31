import { NextResponse } from "next/server"
import { getDb, queryAll, save } from "@/lib/db"
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

  const db = await getDb()
  const rows = queryAll(db, "SELECT * FROM roles ORDER BY user_count DESC")
  return NextResponse.json(rows.map(parseRole))
}

export async function POST(request: Request) {
  const authResult = await requireApiAction("POST", "roles")
  if (!authResult.ok) return authResult.response

  const body = await request.json()
  const db = await getDb()
  const id = String(Date.now())
  const permissions = JSON.stringify(body.permissions || [])
  const policies = JSON.stringify(body.policies || [])
  db.run(
    "INSERT INTO roles (id, name, description, permissions, policies, user_count) VALUES (?, ?, ?, ?, ?, ?)",
    [id, body.name, body.description || "", permissions, policies, body.user_count || 0]
  )
  save(db)
  const row = queryAll(db, "SELECT * FROM roles WHERE id = ?", [id])[0]
  return NextResponse.json(parseRole(row), { status: 201 })
}
