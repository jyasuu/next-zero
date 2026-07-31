import { NextResponse } from "next/server"
import { getDb, queryAll, save } from "@/lib/db"
import { requireApiAction } from "@/lib/api-acl"

export async function GET() {
  const authResult = await requireApiAction("GET", "users")
  if (!authResult.ok) return authResult.response

  const db = await getDb()
  const users = queryAll(db, "SELECT * FROM users ORDER BY created_at DESC")
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const authResult = await requireApiAction("POST", "users")
  if (!authResult.ok) return authResult.response

  const body = await request.json()
  const db = await getDb()
  const id = String(Date.now())
  const createdAt = new Date().toISOString().split("T")[0]
  db.run(
    "INSERT INTO users (id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, body.name, body.email, body.role || "Viewer", body.status || "active", createdAt]
  )
  save(db)
  const user = queryAll(db, "SELECT * FROM users WHERE id = ?", [id])[0]
  return NextResponse.json(user, { status: 201 })
}
