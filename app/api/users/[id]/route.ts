import { NextResponse } from "next/server"
import { getDb, queryRow, queryAll } from "@/lib/db"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await getDb()
  const user = queryRow(db, "SELECT * FROM users WHERE id = ?", [id])
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const db = await getDb()
  const existing = queryRow(db, "SELECT * FROM users WHERE id = ?", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  db.run("UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?",
    [body.name, body.email, body.role, body.status, id])
  return NextResponse.json(queryRow(db, "SELECT * FROM users WHERE id = ?", [id]))
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await getDb()
  const existing = queryRow(db, "SELECT * FROM users WHERE id = ?", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  db.run("DELETE FROM users WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
