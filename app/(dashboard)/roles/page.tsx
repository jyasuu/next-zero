"use client"

import { useState, useCallback } from "react"
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
import { mockRoles, permissionDomains, type Role } from "@/lib/constants"
import type { Policy } from "@/lib/acl"

function actionsToPolicy(actions: string[]): Policy {
  if (actions.length === 0) return { Version: "1", Statement: [] }
  return {
    Version: "1",
    Statement: [{ Effect: "Allow", Action: actions }],
  }
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(mockRoles)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null)
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(permissionDomains.map((d) => d.domain)))

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

  const handleSave = () => {
    if (!editingRole) return
    const actions = editingRole.policies?.flatMap((p) => p.Statement.flatMap((s) => s.Action)) ?? []
    const updatedRole = {
      ...editingRole,
      policies: [actionsToPolicy(actions)],
      permissions: actions,
    }
    setRoles((prev) => {
      const existing = prev.findIndex((r) => r.id === editingRole.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = updatedRole
        return updated
      }
      return [...prev, { ...updatedRole, id: String(Date.now()), userCount: 0 }]
    })
    setDialogOpen(false)
    setEditingRole(null)
  }

  const handleDelete = useCallback((id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id))
    setDeleteConfirmRole(null)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">Define roles and permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRole({ id: "", name: "", description: "", permissions: [], policies: [], userCount: 0 })}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole?.id ? "Edit Role" : "Create Role"}</DialogTitle>
              <DialogDescription>Define the role name, description, and permissions.</DialogDescription>
            </DialogHeader>
            {editingRole && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleDesc">Description</Label>
                  <Input
                    id="roleDesc"
                    value={editingRole.description}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
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
                  <Label className="text-xs text-muted-foreground">Policy Preview</Label>
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(actionsToPolicy(editingRole.policies?.flatMap((p) => p.Statement.flatMap((s) => s.Action)) ?? []), null, 2)}
                  </pre>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleSave}>Save Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                const actions = role.policies?.flatMap((p) => p.Statement.flatMap((s) => s.Action)) ?? role.permissions
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
                        {actions.slice(0, 4).map((perm) => (
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
                    <TableCell>{role.userCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingRole(role); setDialogOpen(true) }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteConfirmRole(role)}
                        >
                          Delete
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
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role &ldquo;{deleteConfirmRole?.name}&rdquo;? This action cannot be undone.
              {deleteConfirmRole && deleteConfirmRole.userCount > 0 && (
                <span className="mt-2 block text-destructive">
                  {deleteConfirmRole.userCount} user(s) are currently assigned to this role.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmRole(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmRole && handleDelete(deleteConfirmRole.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
