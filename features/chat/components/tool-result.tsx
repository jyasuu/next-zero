"use client"

import type { ReactNode } from "react"
import { CheckCircle2, UserRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

function labelOf(key: string): string {
  return LABELS[key] ?? titleCase(key)
}

function unwrapData(output: unknown): unknown {
  if (
    typeof output === "object" &&
    output !== null &&
    "data" in output &&
    Object.keys(output).every((key) => key === "ok" || key === "data")
  ) {
    return (output as Record<string, unknown>).data
  }
  return output
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function statusBadge(status: unknown): ReactNode {
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

function formatValue(value: unknown, key?: string): ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  if (typeof value === "boolean") return booleanBadge(value)
  if (key === "status") return statusBadge(value)
  return String(value)
}

function initialsOf(email: string): string {
  const local = email.split("@")[0] ?? email
  return local
    .replace(/[^a-zA-Z0-9 ._-]/g, "")
    .split(/[ ._\-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
}

interface RowLike {
  [key: string]: unknown
}

function keyValueGrid(record: RowLike): ReactNode {
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

function autoTable(rows: RowLike[]): ReactNode {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No results.</p>
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((key) => (
              <TableHead key={key} className="whitespace-nowrap">
                {labelOf(key)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {columns.map((key) => (
                <TableCell key={key} className="whitespace-nowrap">
                  {formatValue(row[key], key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function WhoAmIView({ output }: { output: unknown }) {
  const email = isPlainObject(output) ? String(output.email ?? "") : ""
  const role = isPlainObject(output) ? String(output.role ?? "") : ""
  const isAdmin = isPlainObject(output) ? Boolean(output.isAdmin) : false
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-3">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary">
          {email ? initialsOf(email) : <UserRound className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-wrap items-center gap-2">
        {email && <span className="font-medium">{email}</span>}
        {role && <Badge variant="secondary">{role}</Badge>}
        <Badge variant={isAdmin ? "success" : "secondary"}>{isAdmin ? "Administrator" : "Member"}</Badge>
      </div>
    </div>
  )
}

function UserDetailView({ output }: { output: unknown }) {
  const user = unwrapData(output)
  if (!isPlainObject(user)) return null
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary">
            {user.name ? initialsOf(String(user.name)) : <UserRound className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{String(user.name ?? "—")}</span>
        {typeof user.status !== "undefined" && statusBadge(user.status)}
      </div>
      {keyValueGrid({
        email: user.email,
        role: user.role,
        id: user.id,
        created_at: user.created_at,
      })}
    </div>
  )
}

function DeletedView() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-emerald-600">
      <CheckCircle2 className="h-3.5 w-3.5" />
      User deleted.
    </p>
  )
}

function GenericView({ output }: { output: unknown }) {
  const data = unwrapData(output)
  if (Array.isArray(data)) {
    if (data.every((item) => isPlainObject(item))) return autoTable(data as RowLike[])
    if (data.length === 0) return <p className="text-xs text-muted-foreground">No results.</p>
    return <p className="text-xs text-muted-foreground">{`${data.length} item(s)`}</p>
  }
  if (isPlainObject(data)) {
    const { success, ...rest } = data as RowLike
    if (success === true && Object.keys(rest).length === 0) return <DeletedView />
    return keyValueGrid(data as RowLike)
  }
  if (typeof data === "string" && data.length > 0) return <p className="text-xs text-muted-foreground">{data}</p>
  return null
}

const TOOL_TEMPLATES: Record<string, (output: unknown) => ReactNode> = {
  account_whoami: (output) => <WhoAmIView output={output} />,
  users_list: (output) => {
    const data = unwrapData(output)
    if (Array.isArray(data) && data.every((item) => isPlainObject(item))) {
      return autoTable(data as RowLike[])
    }
    return <GenericView output={output} />
  },
  users_get: (output) => <UserDetailView output={output} />,
  users_create: (output) => <UserDetailView output={output} />,
  users_update: (output) => <UserDetailView output={output} />,
  users_delete: (output) => {
    const data = unwrapData(output)
    if (data !== null && data !== undefined && !(isPlainObject(data) && data.success === true)) {
      return <GenericView output={output} />
    }
    return <DeletedView />
  },
}

export function ToolResult({ toolId, output }: { toolId: string; output: unknown }) {
  const template = TOOL_TEMPLATES[toolId]
  if (template) return <div className="pt-2">{template(output)}</div>
  return <div className="pt-2">{<GenericView output={output} />}</div>
}
