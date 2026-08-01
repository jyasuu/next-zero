import { NextResponse } from "next/server"
import { queryAll, run } from "@/lib/db"
import { requireApiAction } from "@/lib/api-acl"

export async function GET() {
  const authResult = await requireApiAction("GET", "users")
  if (!authResult.ok) return authResult.response

  const users = await queryAll("SELECT * FROM users ORDER BY created_at DESC")
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const authResult = await requireApiAction("POST", "users")
  if (!authResult.ok) return authResult.response

  const body = await request.json()
  const id = String(Date.now())
  const createdAt = new Date().toISOString().split("T")[0]
  await run(
    "INSERT INTO users (id, name, email, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, body.name, body.email, body.role || "Viewer", body.status || "active", createdAt]
  )
  const user = (await queryAll("SELECT * FROM users WHERE id = $1", [id]))[0]
  return NextResponse.json(user, { status: 201 })
}
