import { NextResponse } from "next/server"
import { getDb, queryRow, queryAll, save } from "@/lib/db"
import { requireApiAction } from "@/lib/api-acl"
import { evictRoleFromCache } from "@/lib/roles"

function parseRole(row: Record<string, unknown>) {
  return {
    ...row,
    permissions: JSON.parse(row.permissions as string),
    policies: JSON.parse(row.policies as string),
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("GET", "roles")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const db = await getDb()
  const row = queryRow(db, "SELECT * FROM roles WHERE id = ?", [id])
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(parseRole(row))
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("PUT", "roles")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const body = await request.json()
  const db = await getDb()
  const existing = queryRow(db, "SELECT * FROM roles WHERE id = ?", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const permissions = JSON.stringify(body.permissions || [])
  const policies = JSON.stringify(body.policies || [])
  db.run("UPDATE roles SET name = ?, description = ?, permissions = ?, policies = ? WHERE id = ?",
    [body.name, body.description, permissions, policies, id])
  save(db)
  evictRoleFromCache(existing.name as string)
  evictRoleFromCache(body.name as string)
  return NextResponse.json(parseRole(queryRow(db, "SELECT * FROM roles WHERE id = ?", [id])!))
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("DELETE", "roles")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const db = await getDb()
  const existing = queryRow(db, "SELECT * FROM roles WHERE id = ?", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  db.run("DELETE FROM roles WHERE id = ?", [id])
  save(db)
  evictRoleFromCache(existing.name as string)
  return NextResponse.json({ success: true })
}
