import { NextResponse } from "next/server"
import { getDb, queryRow, queryAll, save } from "@/lib/db"
import { requireApiAction } from "@/lib/api-acl"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("GET", "users")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const db = await getDb()
  const user = queryRow(db, "SELECT * FROM users WHERE id = ?", [id])
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("PUT", "users")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const body = await request.json()
  const db = await getDb()
  const existing = queryRow(db, "SELECT * FROM users WHERE id = ?", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  db.run("UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?",
    [body.name, body.email, body.role, body.status, id])
  save(db)
  return NextResponse.json(queryRow(db, "SELECT * FROM users WHERE id = ?", [id]))
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("DELETE", "users")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const db = await getDb()
  const existing = queryRow(db, "SELECT * FROM users WHERE id = ?", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  db.run("DELETE FROM users WHERE id = ?", [id])
  save(db)
  return NextResponse.json({ success: true })
}
