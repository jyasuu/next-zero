"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { BookMarked } from "lucide-react"
import type { ZodIssue } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ForbiddenCard } from "@/components/forbidden-card"
import { useSkillsStore } from "@/features/skills/store"
import { skillSchema, type SkillRow } from "@/features/skills/lib/skill"

type SkillFields = { name: string; description: string; content: string }

const EMPTY_FORM: SkillFields = { name: "", description: "", content: "" }

function fieldErrorKey(
  field: "name" | "description" | "content",
  issue?: { code: string }
): string | undefined {
  if (!issue) return undefined
  switch (field) {
    case "name":
      if (issue.code === "too_small") return "errors.nameRequired"
      if (issue.code === "invalid_string") return "errors.nameInvalid"
      if (issue.code === "too_big") return "errors.nameTooLong"
      return "errors.nameInvalid"
    case "description":
      if (issue.code === "too_small") return "errors.descriptionRequired"
      if (issue.code === "too_big") return "errors.descriptionTooLong"
      return "errors.descriptionRequired"
    case "content":
      return "errors.contentRequired"
  }
}

function firstFieldIssue(issue: ZodIssue | undefined, field: string): { code: string } | undefined {
  if (!issue || issue.path[0] !== field) return undefined
  return issue
}

export function SkillsPanel() {
  const t = useTranslations("skills")
  const { rows: skills, loading, forbidden, load, upsert } = useSkillsStore()

  const [form, setForm] = useState<SkillFields>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<"name" | "description" | "content", string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [editing, setEditing] = useState<SkillRow | null>(null)
  const [editForm, setEditForm] = useState<SkillFields>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<Partial<Record<"name" | "description" | "content", string>>>({})
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState<SkillRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = skillSchema.safeParse(form)
    if (!parsed.success) {
      const issues = parsed.error.issues
      setFormErrors({
        name: fieldErrorKey("name", firstFieldIssue(issues[0], "name")),
        description: fieldErrorKey("description", firstFieldIssue(issues[0], "description")),
        content: fieldErrorKey("content", firstFieldIssue(issues[0], "content")),
      })
      return
    }
    setSubmitting(true)
    setFormError(null)
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })
    if (res.status === 409) {
      setFormError(t("nameExists"))
    } else if (res.ok) {
      const row = (await res.json()) as SkillRow
      upsert(row)
      setForm(EMPTY_FORM)
      setFormErrors({})
    } else {
      setFormError(t("createFailed"))
    }
    setSubmitting(false)
  }

  const openEdit = (skill: SkillRow) => {
    setEditing(skill)
    setEditForm({ name: skill.name, description: skill.description, content: skill.content })
    setEditErrors({})
    setEditError(null)
  }

  const closeEdit = () => {
    setEditing(null)
    setEditErrors({})
    setEditError(null)
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    const parsed = skillSchema.safeParse(editForm)
    if (!parsed.success) {
      const issues = parsed.error.issues
      setEditErrors({
        name: fieldErrorKey("name", firstFieldIssue(issues[0], "name")),
        description: fieldErrorKey("description", firstFieldIssue(issues[0], "description")),
        content: fieldErrorKey("content", firstFieldIssue(issues[0], "content")),
      })
      return
    }
    setSaving(true)
    setEditError(null)
    const res = await fetch(`/api/skills/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })
    if (res.status === 409) {
      setEditError(t("nameExists"))
    } else if (res.ok) {
      const row = (await res.json()) as SkillRow
      upsert(row)
      closeEdit()
    } else {
      setEditError(t("saveFailed"))
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteError(null)
    const res = await fetch(`/api/skills/${deleting.id}`, { method: "DELETE" })
    if (res.ok) {
      setDeleting(null)
      load()
    } else {
      setDeleteError(t("deleteFailed"))
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">{t("nameField")}</Label>
              <Input
                id="skill-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("namePlaceholder")}
              />
              {formErrors.name && <p className="text-sm text-destructive">{t(formErrors.name)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-description">{t("descriptionField")}</Label>
              <Input
                id="skill-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("descriptionPlaceholder")}
              />
              {formErrors.description && <p className="text-sm text-destructive">{t(formErrors.description)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-content">{t("contentField")}</Label>
              <Textarea
                id="skill-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={t("contentPlaceholder")}
                rows={6}
              />
              {formErrors.content && <p className="text-sm text-destructive">{t(formErrors.content)}</p>}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={submitting}>
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {forbidden ? (
            <ForbiddenCard />
          ) : loading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : skills.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <BookMarked className="h-8 w-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead>{t("updated")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <BookMarked className="h-4 w-4 text-muted-foreground" />
                        {skill.name}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="line-clamp-2">{skill.description}</span>
                    </TableCell>
                    <TableCell>{new Date(skill.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(skill)}>
                          {t("edit")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleting(skill)}>
                          {t("delete")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-edit-name">{t("nameField")}</Label>
              <Input
                id="skill-edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              {editErrors.name && <p className="text-sm text-destructive">{t(editErrors.name)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-edit-description">{t("descriptionField")}</Label>
              <Input
                id="skill-edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
              {editErrors.description && <p className="text-sm text-destructive">{t(editErrors.description)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-edit-content">{t("contentField")}</Label>
              <Textarea
                id="skill-edit-content"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={6}
              />
              {editErrors.content && <p className="text-sm text-destructive">{t(editErrors.content)}</p>}
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEdit}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>{t("deleteDescription", { name: deleting?.name ?? "" })}</DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
