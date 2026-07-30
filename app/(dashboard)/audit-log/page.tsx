"use client"

import { useMemo, useState } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { ArrowUpDown, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockAuditEntries, type AuditEntry } from "@/lib/constants"

const actionVariants: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  create: "success",
  update: "secondary",
  delete: "destructive",
  login: "default",
  logout: "default",
  export: "warning",
}

export default function AuditLogPage() {
  const t = useTranslations("auditLog")
  const [data] = useState<AuditEntry[]>(mockAuditEntries)
  const [globalFilter, setGlobalFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  const filteredData = actionFilter === "all" ? data : data.filter((d) => d.action === actionFilter)

  const columns: ColumnDef<AuditEntry>[] = useMemo(() => [
    {
      accessorKey: "user",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("user")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "action",
      header: t("action"),
      cell: ({ row }) => (
        <Badge variant={actionVariants[row.getValue("action") as string] ?? "secondary"}>
          {row.getValue("action") as string}
        </Badge>
      ),
    },
    {
      accessorKey: "resource",
      header: t("resource"),
    },
    {
      accessorKey: "details",
      header: t("details"),
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("details") as string}</span>,
    },
    {
      accessorKey: "ip",
      header: t("ip"),
    },
    {
      accessorKey: "timestamp",
      header: t("timestamp"),
      cell: ({ row }) => new Date(row.getValue("timestamp") as string).toLocaleString(),
    },
  ], [t])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 10 } },
  })

  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const exportCSV = () => {
    const headers = [t("user"), t("action"), t("resource"), t("details"), t("ip"), t("timestamp")]
    const rows = filteredData.map((d) => [d.user, d.action, d.resource, d.details, d.ip, d.timestamp])
    const csv = [headers.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "audit-log.csv"
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" />
          {t("exportCSV")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder={t("searchAuditLog")}
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("action")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allActions")}</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
            <SelectItem value="export">Export</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          {t("previous")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {t("page", { current: table.getState().pagination.pageIndex + 1, total: table.getPageCount() })}
        </span>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          {t("next")}
        </Button>
      </div>
    </div>
  )
}
