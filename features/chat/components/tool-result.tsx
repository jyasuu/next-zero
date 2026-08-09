"use client"

import type { ReactNode } from "react"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { CheckCircle2, BookMarked, UserRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useFormFillStore } from "@/stores/form-fill-store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatValue,
  isPlainObject,
  keyValueGrid,
  labelOf,
  statusBadge,
  type RowLike,
} from "@/features/chat/components/format"
import {
  deletedOutputSchema,
  formFillOutputSchema,
  questionOutputSchema,
  skillOutputSchema,
  userRowOutputSchema,
  usersListOutputSchema,
  whoamiOutputSchema,
  type QuestionOutput,
  type QuestionPrompt,
  type SkillOutput,
  type ToolId,
  type UserRow,
  type WhoAmIOutput,
} from "@/features/chat/types"
import { questionsFromInput } from "@/features/chat/lib/question-flow"

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

function initialsOf(value: string): string {
  const local = value.split("@")[0] ?? value
  return local
    .replace(/[^a-zA-Z0-9 ._-]/g, "")
    .split(/[ ._\-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
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

function WhoAmIView({ output }: { output: WhoAmIOutput }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-3">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary">
          {output.email ? initialsOf(output.email) : <UserRound className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-wrap items-center gap-2">
        {output.email && <span className="font-medium">{output.email}</span>}
        {output.role && <Badge variant="secondary">{output.role}</Badge>}
        <Badge variant={output.isAdmin ? "success" : "secondary"}>
          {output.isAdmin ? "Administrator" : "Member"}
        </Badge>
      </div>
    </div>
  )
}

function UsersTableView({ users }: { users: UserRow[] }) {
  if (users.length === 0) return <p className="text-xs text-muted-foreground">No results.</p>
  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Name</TableHead>
            <TableHead className="whitespace-nowrap">Email</TableHead>
            <TableHead className="whitespace-nowrap">Role</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => (
            <TableRow key={index}>
              <TableCell className="whitespace-nowrap font-medium">{user.name}</TableCell>
              <TableCell className="whitespace-nowrap">{user.email}</TableCell>
              <TableCell className="whitespace-nowrap">{user.role}</TableCell>
              <TableCell className="whitespace-nowrap">{statusBadge(user.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function UserDetailView({ user }: { user: UserRow }) {
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary">
            {user.name ? initialsOf(user.name) : <UserRound className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{user.name}</span>
        {statusBadge(user.status)}
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

function QuestionView({ output, questions }: { output: QuestionOutput; questions: QuestionPrompt[] }) {
  const t = useTranslations("chat")
  if (questions.length === 0) {
    return (
      <div className="space-y-1 rounded-md border bg-background p-3">
        <p className="text-xs text-muted-foreground">{output.summary}</p>
      </div>
    )
  }
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      {questions.map((question, index) => {
        const answers = output.answers[index] ?? []
        return (
          <div key={index} className="text-xs">
            <p className="font-medium">{question.question}</p>
            <p className="text-muted-foreground">
              {answers.length > 0 ? answers.join(", ") : t("question.unanswered")}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function SkillView({ output }: { output: SkillOutput }) {
  const t = useTranslations("chat")
  return (
    <div className="flex items-start gap-3 rounded-md border bg-background p-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/10 text-primary">
          <BookMarked className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{output.name}</span>
          <Badge variant="success">{t("skill.loaded")}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{output.description}</p>
      </div>
    </div>
  )
}

function FormFillView({ toolId, output }: { toolId: string; output: unknown }) {
  const t = useTranslations("chat")
  const parsed = parseOrNull(formFillOutputSchema, output)
  const hasApplyHandler = useFormFillStore((s) => s.hasApplyHandler(toolId))
  const applyFormFill = useFormFillStore((s) => s.applyFormFill)

  if (!parsed) return <GenericView output={output} />
  const hasErrors = Object.keys(parsed.errors).length > 0
  const hasValues = Object.keys(parsed.values).length > 0
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center gap-2">
        <Badge variant={parsed.valid ? "success" : "destructive"}>
          {parsed.valid ? t("formFill.valid") : t("formFill.invalid")}
        </Badge>
        {parsed.valid && !hasErrors && (
          <span className="text-xs text-muted-foreground">{t("formFill.noErrors")}</span>
        )}
      </div>
      {Object.entries(parsed.values).map(([field, value]) => (
        <div key={field} className="text-xs">
          <span className="text-muted-foreground">{labelOf(field)}</span>
          <p className="font-medium">{value}</p>
          {parsed.errors[field] && (
            <p className="text-destructive">{parsed.errors[field]}</p>
          )}
        </div>
      ))}
      {hasApplyHandler && hasValues && (
        <Button variant="outline" size="sm" className="mt-1" onClick={() => applyFormFill(toolId, parsed.values)}>
          {t("formFill.apply")}
        </Button>
      )}
    </div>
  )
}

function GenericView({ output }: { output: unknown }) {
  const data = unwrapData(output)
  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="text-xs text-muted-foreground">No results.</p>
    if (data.every((item) => isPlainObject(item))) return autoTable(data as RowLike[])
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

function parseOrNull<T>(schema: z.ZodType<T>, output: unknown): T | null {
  const parsed = schema.safeParse(unwrapData(output))
  return parsed.success ? parsed.data : null
}

type ToolRenderer = (output: unknown, input?: unknown) => ReactNode

function renderUserDetail(output: unknown): ReactNode {
  const parsed = parseOrNull(userRowOutputSchema, output)
  return parsed ? <UserDetailView user={parsed} /> : <GenericView output={output} />
}

const TOOL_TEMPLATES: { [K in ToolId]: ToolRenderer } = {
  account_whoami: (output) => {
    const parsed = parseOrNull(whoamiOutputSchema, output)
    return parsed ? <WhoAmIView output={parsed} /> : <GenericView output={output} />
  },
  users_list: (output) => {
    const parsed = parseOrNull(usersListOutputSchema, output)
    return parsed ? <UsersTableView users={parsed} /> : <GenericView output={output} />
  },
  users_get: renderUserDetail,
  users_create: renderUserDetail,
  users_update: renderUserDetail,
  users_delete: (output) => {
    const parsed = parseOrNull(deletedOutputSchema, output)
    return parsed ? <DeletedView /> : <GenericView output={output} />
  },
  expenses_form_fill: (output) => <FormFillView toolId="expenses_form_fill" output={output} />,
  requests_form_fill: (output) => <FormFillView toolId="requests_form_fill" output={output} />,
  question: (output, input) => {
    const parsed = parseOrNull(questionOutputSchema, output)
    if (!parsed) return <GenericView output={output} />
    return <QuestionView output={parsed} questions={questionsFromInput(input)} />
  },
  skill: (output) => {
    const parsed = parseOrNull(skillOutputSchema, output)
    return parsed ? <SkillView output={parsed} /> : <GenericView output={output} />
  },
}

export function hasToolRenderer(toolId: string): boolean {
  return toolId in TOOL_TEMPLATES
}

export function ToolResult({ toolId, output, input }: { toolId: string; output: unknown; input?: unknown }) {
  const template = (TOOL_TEMPLATES as Record<string, ToolRenderer | undefined>)[toolId]
  if (template) return <div className="pt-2">{template(output, input)}</div>
  return <div className="pt-2">{<GenericView output={output} />}</div>
}
