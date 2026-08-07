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
import { useExpensesStore } from "@/features/expenses/store"
import { expenseFormSchema } from "@/features/expenses/lib/form"
import { EXPENSE_STATUSES, type ExpenseStatus } from "@/features/expenses/lib/workflow"
import type { ExpenseRow } from "@/features/expenses/lib/visibility"
import { useRegisterFormFillApply } from "@/stores/form-fill-store"

interface ExpensesPanelProps {
  canApprove: boolean
  email: string
}

type ExpenseFilter = "all" | ExpenseStatus

const STATUS_BADGE_VARIANT: Record<ExpenseStatus, "warning" | "success" | "destructive" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "secondary",
}

export function ExpensesPanel({ canApprove, email }: ExpensesPanelProps) {
  const t = useTranslations("expenses")
  const { rows: expenses, loading, forbidden, load, upsert } = useExpensesStore()
  const [filter, setFilter] = useState<ExpenseFilter>("all")

  const [form, setForm] = useState({ title: "", amount: "", justification: "" })
  const [formErrors, setFormErrors] = useState<Partial<Record<"title" | "amount" | "justification", string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const [rejectTarget, setRejectTarget] = useState<ExpenseRow | null>(null)
  const [rejectComment, setRejectComment] = useState("")

  useEffect(() => { load() }, [load])

  useRegisterFormFillApply("expenses_form_fill", form, setForm, setFormErrors)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = expenseFormSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setFormErrors({
        title: fieldErrors.title?.[0],
        amount: fieldErrors.amount?.[0],
        justification: fieldErrors.justification?.[0],
      })
      return
    }
    setSubmitting(true)
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })
    if (res.ok) {
      const row = (await res.json()) as ExpenseRow
      upsert(row)
      setForm({ title: "", amount: "", justification: "" })
      setFormErrors({})
    }
    setSubmitting(false)
  }

  const decide = async (id: string, action: "approve" | "reject" | "reopen", comment?: string) => {
    const res = await fetch(`/api/expenses/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    })
    if (res.ok) load()
  }

  const cancelExpense = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}/cancel`, { method: "POST" })
    if (res.ok) load()
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    await decide(rejectTarget.id, "reject", rejectComment.trim() || undefined)
    setRejectTarget(null)
    setRejectComment("")
  }

  const visibleExpenses = filter === "all" ? expenses : expenses.filter((e) => e.status === filter)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-title">{t("titleField")}</Label>
              <Input
                id="expense-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("titlePlaceholder")}
              />
              {formErrors.title && <p className="text-sm text-destructive">{t("errors.titleRequired")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">{t("amountField")}</Label>
              <Input
                id="expense-amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder={t("amountPlaceholder")}
              />
              {formErrors.amount && <p className="text-sm text-destructive">{t("errors.amountInvalid")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-justification">{t("justificationField")}</Label>
              <Textarea
                id="expense-justification"
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
          <Select value={filter} onValueChange={(v) => setFilter(v as ExpenseFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              {EXPENSE_STATUSES.map((status) => (
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
          ) : visibleExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("requester")}</TableHead>
                  <TableHead>{t("titleField")}</TableHead>
                  <TableHead>{t("amountField")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("created")}</TableHead>
                  <TableHead>{t("decided")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.requester_email}</TableCell>
                    <TableCell className="font-medium">
                      {expense.title}
                      {expense.decision_comment && (
                        <p className="text-xs text-muted-foreground">
                          {t("comment")}: {expense.decision_comment}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{expense.amount}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[expense.status]}>{t(`status${expense.status[0].toUpperCase()}${expense.status.slice(1)}`)}</Badge>
                    </TableCell>
                    <TableCell>{new Date(expense.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {expense.decided_by ?? "—"}
                      {expense.decided_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(expense.decided_at).toLocaleDateString()}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {expense.status === "pending" && canApprove && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => decide(expense.id, "approve")}>
                            {t("approve")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectTarget(expense)}>
                            {t("reject")}
                          </Button>
                        </div>
                      )}
                      {expense.status === "pending" && expense.requester_email === email && (
                        <Button size="sm" variant="outline" onClick={() => cancelExpense(expense.id)}>
                          {t("cancel")}
                        </Button>
                      )}
                      {expense.status === "rejected" && canApprove && (
                        <Button size="sm" onClick={() => decide(expense.id, "reopen")}>
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
