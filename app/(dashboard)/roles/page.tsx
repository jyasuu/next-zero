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
import { Plus, Shield } from "lucide-react"
import { mockRoles, allPermissions, type Role } from "@/lib/constants"

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(mockRoles)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null)

  const handleSave = () => {
    if (!editingRole) return
    setRoles((prev) => {
      const existing = prev.findIndex((r) => r.id === editingRole.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = editingRole
        return updated
      }
      return [...prev, { ...editingRole, id: String(Date.now()), userCount: 0 }]
    })
    setDialogOpen(false)
    setEditingRole(null)
  }

  const handleDelete = useCallback((id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id))
    setDeleteConfirmRole(null)
  }, [])

  const togglePermission = (perm: string) => {
    if (!editingRole) return
    setEditingRole({
      ...editingRole,
      permissions: editingRole.permissions.includes(perm)
        ? editingRole.permissions.filter((p) => p !== perm)
        : [...editingRole.permissions, perm],
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
            <Button onClick={() => setEditingRole({ id: "", name: "", description: "", permissions: [], userCount: 0 })}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
                  <div className="grid grid-cols-2 gap-2">
                    {allPermissions.map((perm) => (
                      <div key={perm} className="flex items-center gap-2">
                        <Checkbox
                          id={`perm-${perm}`}
                          checked={editingRole.permissions.includes(perm)}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <Label htmlFor={`perm-${perm}`} className="text-sm capitalize">
                          {perm.replace(/_/g, " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
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
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((perm) => (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {perm.replace(/_/g, " ")}
                        </Badge>
                      ))}
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
              ))}
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
