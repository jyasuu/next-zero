"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { requestFormSchema } from "@/features/requests/lib/form"
import { REQUEST_STATUSES, type RequestStatus } from "@/features/requests/lib/workflow"
import type { RequestRow } from "@/features/requests/lib/visibility"

interface RequestsPanelProps {
  canApprove: boolean
  email: string
}

type RequestFilter = "all" | RequestStatus

const STATUS_BADGE_VARIANT: Record<RequestStatus, "warning" | "success" | "destructive" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "secondary",
}

export function RequestsPanel({ canApprove, email }: RequestsPanelProps) {
  const t = useTranslations("requests")
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [filter, setFilter] = useState<RequestFilter>("all")

  const [form, setForm] = useState({ title: "", access: "", justification: "" })
  const [formErrors, setFormErrors] = useState<Partial<Record<"title" | "access" | "justification", string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const [rejectTarget, setRejectTarget] = useState<RequestRow | null>(null)
  const [rejectComment, setRejectComment] = useState("")

  const fetchRequests = async () => {
    const res = await fetch("/api/requests")
    if (res.status === 403) {
      setForbidden(true)
      setLoading(false)
      return
    }
    setRequests(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = requestFormSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setFormErrors({
        title: fieldErrors.title?.[0],
        access: fieldErrors.access?.[0],
        justification: fieldErrors.justification?.[0],
      })
      return
    }
    setSubmitting(true)
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })
    if (res.ok) {
      setForm({ title: "", access: "", justification: "" })
      setFormErrors({})
      fetchRequests()
    }
    setSubmitting(false)
  }

  const decide = async (id: string, action: "approve" | "reject" | "reopen", comment?: string) => {
    const res = await fetch(`/api/requests/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    })
    if (res.ok) fetchRequests()
  }

  const cancelRequest = async (id: string) => {
    const res = await fetch(`/api/requests/${id}/cancel`, { method: "POST" })
    if (res.ok) fetchRequests()
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    await decide(rejectTarget.id, "reject", rejectComment.trim() || undefined)
    setRejectTarget(null)
    setRejectComment("")
  }

  const visibleRequests = filter === "all" ? requests : requests.filter((r) => r.status === filter)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-title">{t("titleField")}</Label>
              <Input
                id="request-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("titlePlaceholder")}
              />
              {formErrors.title && <p className="text-sm text-destructive">{t("errors.titleRequired")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-access">{t("accessField")}</Label>
              <Input
                id="request-access"
                value={form.access}
                onChange={(e) => setForm({ ...form, access: e.target.value })}
                placeholder={t("accessPlaceholder")}
              />
              {formErrors.access && <p className="text-sm text-destructive">{t("errors.accessRequired")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-justification">{t("justificationField")}</Label>
              <Textarea
                id="request-justification"
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
                placeholder={t("justificationPlaceholder")}
              />
              {formErrors.justification && <p className="text-sm text-destructive">{t("errors.justificationRequired")}</p>}
            </div>
            <Button type="submit" disabled={submitting}>
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("listTitle")}</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as RequestFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              {REQUEST_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`filter${status[0].toUpperCase()}${status.slice(1)}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {forbidden ? (
            <ForbiddenCard />
          ) : loading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : visibleRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("requester")}</TableHead>
                  <TableHead>{t("titleField")}</TableHead>
                  <TableHead>{t("accessField")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("created")}</TableHead>
                  <TableHead>{t("decided")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.requester_email}</TableCell>
                    <TableCell className="font-medium">
                      {request.title}
                      {request.decision_comment && (
                        <p className="text-xs text-muted-foreground">
                          {t("comment")}: {request.decision_comment}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{request.access}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{t(`status${request.status[0].toUpperCase()}${request.status.slice(1)}`)}</Badge>
                    </TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {request.decided_by ?? "—"}
                      {request.decided_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.decided_at).toLocaleDateString()}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "pending" && canApprove && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => decide(request.id, "approve")}>
                            {t("approve")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectTarget(request)}>
                            {t("reject")}
                          </Button>
                        </div>
                      )}
                      {request.status === "pending" && request.requester_email === email && (
                        <Button size="sm" variant="outline" onClick={() => cancelRequest(request.id)}>
                          {t("cancel")}
                        </Button>
                      )}
                      {request.status === "rejected" && canApprove && (
                        <Button size="sm" onClick={() => decide(request.id, "reopen")}>
                          {t("reopen")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reject")}</DialogTitle>
            <DialogDescription>{rejectTarget?.title}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder={t("rejectCommentPlaceholder")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              {t("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
