"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"

const LABELS: Record<string, string> = {
  id: "ID",
  name: "Name",
  email: "Email",
  role: "Role",
  status: "Status",
  isAdmin: "Administrator",
  created_at: "Created",
}

function titleCase(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
}

export function labelOf(key: string): string {
  return LABELS[key] ?? titleCase(key)
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function statusBadge(status: unknown): ReactNode {
  const value = String(status ?? "").toLowerCase()
  return (
    <Badge variant={value === "active" ? "success" : "secondary"} className="capitalize">
      {value || "—"}
    </Badge>
  )
}

function booleanBadge(value: boolean): ReactNode {
  return value ? (
    <Badge variant="success">Yes</Badge>
  ) : (
    <Badge variant="secondary">No</Badge>
  )
}

export function formatValue(value: unknown, key?: string): ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  if (typeof value === "boolean") return booleanBadge(value)
  if (key === "status") return statusBadge(value)
  return String(value)
}

export interface RowLike {
  [key: string]: unknown
}

export function keyValueGrid(record: RowLike): ReactNode {
  const entries = Object.entries(record)
  if (entries.length === 0) return null
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{labelOf(key)}</dt>
          <dd className="font-medium">{formatValue(value, key)}</dd>
        </div>
      ))}
    </dl>
  )
}
