import { NextResponse } from "next/server"
import { queryRow, run } from "@/lib/db"
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
  const row = await queryRow("SELECT * FROM roles WHERE id = $1", [id])
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(parseRole(row))
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("PUT", "roles")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const body = await request.json()
  const existing = await queryRow("SELECT * FROM roles WHERE id = $1", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const permissions = JSON.stringify(body.permissions || [])
  const policies = JSON.stringify(body.policies || [])
  await run(
    "UPDATE roles SET name = $1, description = $2, permissions = $3, policies = $4 WHERE id = $5",
    [body.name, body.description, permissions, policies, id]
  )
  evictRoleFromCache(existing.name as string)
  evictRoleFromCache(body.name as string)
  return NextResponse.json(parseRole((await queryRow("SELECT * FROM roles WHERE id = $1", [id]))!))
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("DELETE", "roles")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const existing = await queryRow("SELECT * FROM roles WHERE id = $1", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await run("DELETE FROM roles WHERE id = $1", [id])
  evictRoleFromCache(existing.name as string)
  return NextResponse.json({ success: true })
}
