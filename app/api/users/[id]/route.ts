import { NextResponse } from "next/server"
import { queryRow, run } from "@/lib/db"
import { requireApiAction } from "@/lib/api-acl"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("GET", "users")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const user = await queryRow("SELECT * FROM users WHERE id = $1", [id])
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("PUT", "users")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const body = await request.json()
  const existing = await queryRow("SELECT * FROM users WHERE id = $1", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await run(
    "UPDATE users SET name = $1, email = $2, role = $3, status = $4 WHERE id = $5",
    [body.name, body.email, body.role, body.status, id]
  )
  return NextResponse.json(await queryRow("SELECT * FROM users WHERE id = $1", [id]))
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAction("DELETE", "users")
  if (!authResult.ok) return authResult.response

  const { id } = await params
  const existing = await queryRow("SELECT * FROM users WHERE id = $1", [id])
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await run("DELETE FROM users WHERE id = $1", [id])
  return NextResponse.json({ success: true })
}
