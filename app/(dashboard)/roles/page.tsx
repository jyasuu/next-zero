"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Shield, ChevronDown, ChevronRight } from "lucide-react"
import { permissionDomains } from "@/lib/constants"
import type { Policy } from "@/lib/acl"
import { ForbiddenCard } from "@/components/forbidden-card"

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  policies?: Policy[]
  user_count?: number
  userCount?: number
}

function actionsToPolicy(actions: string[]): Policy {
  if (actions.length === 0) return { Version: "1", Statement: [] }
  return {
    Version: "1",
    Statement: [{ Effect: "Allow", Action: actions }],
  }
}

export default function RolesPage() {
  const t = useTranslations("roles")
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null)
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(permissionDomains.map((d) => d.domain)))
  const [forbidden, setForbidden] = useState(false)

  const fetchRoles = async () => {
    const res = await fetch("/api/roles")
    if (res.status === 403) {
      setForbidden(true)
      setLoading(false)
      return
    }
    const data = await res.json()
    setRoles(data)
    setLoading(false)
  }

  useEffect(() => { fetchRoles() }, [])

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  const selectedActions = editingRole
    ? editingRole.policies?.flatMap((p) => p.Statement.flatMap((s) => s.Action)) ?? editingRole.permissions
    : []

  const isSelected = (action: string) => {
    return selectedActions.some((a) => a === action || a === action.split(":")[1])
  }

  const handleSave = async () => {
    if (!editingRole) return
    const actions = editingRole.policies?.flatMap((p) => p.Statement.flatMap((s) => s.Action)) ?? editingRole.permissions
    const body = {
      name: editingRole.name,
      description: editingRole.description,
      permissions: actions.map((a: string) => (a.includes(":") ? a.split(":")[1] : a)),
      policies: [actionsToPolicy(actions)],
    }
    let res: Response
    if (editingRole.id && roles.find((r) => r.id === editingRole.id)) {
      res = await fetch(`/api/roles/${editingRole.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } else {
      res = await fetch("/api/roles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }
    if (res.status === 403) {
      setDialogOpen(false)
      setEditingRole(null)
      setForbidden(true)
      return
    }
    setDialogOpen(false)
    setEditingRole(null)
    await fetchRoles()
  }

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" })
    if (res.status === 403) {
      setDeleteConfirmRole(null)
      setForbidden(true)
      return
    }
    setDeleteConfirmRole(null)
    await fetchRoles()
  }, [])

  const toggleAction = (action: string) => {
    if (!editingRole) return
    const current = editingRole.policies?.flatMap((p) => p.Statement.flatMap((s) => s.Action)) ?? []
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action]
    setEditingRole({
      ...editingRole,
      policies: [actionsToPolicy(next)],
    })
  }

  const openCreate = () => {
    setEditingRole({ id: "", name: "", description: "", permissions: [], policies: [] })
    setDialogOpen(true)
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>

  if (forbidden) return <ForbiddenCard />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("createRole")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole?.id ? t("editRole") : t("createRole")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>
            {editingRole && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roleName">{t("roleName")}</Label>
                  <Input
                    id="roleName"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleDesc">{t("roleDesc")}</Label>
                  <Input
                    id="roleDesc"
                    value={editingRole.description}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("permissions")}</Label>
                  <div className="rounded-md border p-3 space-y-1">
                    {permissionDomains.map((group) => {
                      const domainSelectedCount = group.actions.filter(isSelected).length
                      const isExpanded = expandedDomains.has(group.domain)
                      return (
                        <div key={group.domain}>
                          <button
                            type="button"
                            onClick={() => toggleDomain(group.domain)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-accent"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {group.label}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {domainSelectedCount}/{group.actions.length}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="ml-2 grid grid-cols-2 gap-1 py-1 pl-4 border-l">
                              {group.actions.map((action) => (
                                <div key={action} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`perm-${action}`}
                                    checked={isSelected(action)}
                                    onCheckedChange={() => toggleAction(action)}
                                  />
                                  <Label htmlFor={`perm-${action}`} className="text-sm">
                                    {action.split(":")[1]}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("policyPreview")}</Label>
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(actionsToPolicy(editingRole.policies?.flatMap((p) => p.Statement.flatMap((s) => s.Action)) ?? []), null, 2)}
                  </pre>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleSave}>{t("saveRole")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead>{t("permissions")}</TableHead>
                <TableHead>{t("users")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                const actions = role.policies?.flatMap((p) => p.Statement.flatMap((s) => s.Action)) ?? role.permissions
                const uc = role.user_count ?? role.userCount ?? 0
                return (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{role.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {actions.slice(0, 4).map((perm: string) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm.includes(":") ? perm.split(":")[1] : perm}
                          </Badge>
                        ))}
                        {actions.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{actions.length - 4}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{uc}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingRole(role); setDialogOpen(true) }}
                        >
                          {t("editRole")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteConfirmRole(role)}
                        >
                          {t("deleteRole")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!deleteConfirmRole} onOpenChange={(open) => !open && setDeleteConfirmRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteRole")}</DialogTitle>
            <DialogDescription>
              {t("confirmDelete", { name: deleteConfirmRole?.name ?? "" })}
              {deleteConfirmRole && (deleteConfirmRole.user_count ?? deleteConfirmRole.userCount ?? 0) > 0 && (
                <span className="mt-2 block text-destructive">
                  {t("usersAssigned", { count: deleteConfirmRole.user_count ?? deleteConfirmRole.userCount ?? 0 })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmRole(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmRole && handleDelete(deleteConfirmRole.id)}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
