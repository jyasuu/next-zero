"use client"

import { useMemo } from "react"
import { Check, HelpCircle, ShieldCheck, ShieldX, Wrench } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ToolArguments } from "@/features/chat/components/tool-arguments"
import { ToolResult } from "@/features/chat/components/tool-result"
import { QuestionCard } from "@/features/chat/components/question-card"
import {
  isOutputAvailable,
  isOutputError,
  toolNameFromPart,
  type ToolPartLike,
} from "@/features/chat/lib/parts"
import { shouldRequireApproval } from "@/features/chat/lib/approval"
import { questionsFromInput } from "@/features/chat/lib/question-flow"
import type { ChatTool, QuestionAnswers, QuestionPrompt } from "@/features/chat/types"

interface ToolCardProps {
  tool: ChatTool | undefined
  part: ToolPartLike
  onApprove: () => void
  onDeny: () => void
  onAnswer?: (answers: QuestionAnswers) => void
  onDismiss?: () => void
}

export function ToolCard({ tool, part, onApprove, onDeny, onAnswer, onDismiss }: ToolCardProps) {
  const t = useTranslations("chat")
  const name = tool?.name ?? part.type.replace("tool-", "")
  const toolId = tool?.id ?? toolNameFromPart(part) ?? name
  const needsApproval =
    part.state === "input-available" && tool !== undefined && shouldRequireApproval(tool)
  const toolUnavailable = part.state === "input-available" && tool === undefined
  const isQuestionTool = tool?.id === "question"

  const questions = useMemo<QuestionPrompt[]>(
    () => (isQuestionTool ? questionsFromInput(part.input) : []),
    [isQuestionTool, part.input]
  )

  const isQuestion = part.state === "input-available" && questions.length > 0

  return (
    <div className="rounded-lg border bg-muted/50 text-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{name}</span>
        {isOutputAvailable(part) && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3 w-3" />
            {t("toolCompleted")}
          </span>
        )}
        {isOutputError(part) && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-destructive">
            <ShieldX className="h-3 w-3" />
            {t("toolFailed")}
          </span>
        )}
        {needsApproval && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-amber-600">
            <ShieldCheck className="h-3 w-3" />
            {t("awaitingApproval")}
          </span>
        )}
        {isQuestionTool && part.state === "input-available" && !needsApproval && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-amber-600">
            <HelpCircle className="h-3 w-3" />
            {t("question.awaitingAnswer")}
          </span>
        )}
      </div>

      <div className="px-3 py-2">
        {isQuestion ? (
          <QuestionCard
            questions={questions}
            onAnswer={onAnswer ?? (() => {})}
            onDismiss={onDismiss ?? (() => {})}
          />
        ) : (
          <>
            {part.input !== undefined && <ToolArguments input={part.input} />}

            {isOutputAvailable(part) && part.output !== undefined && (
              <ToolResult toolId={toolId} output={part.output} />
            )}

            {isOutputError(part) && (
              <p className="pt-2 text-xs text-destructive">
                {part.errorText ?? (typeof part.output === "string" ? part.output : "Tool execution failed.")}
              </p>
            )}

            {needsApproval && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={onApprove}>
                  {t("approve")}
                </Button>
                <Button size="sm" variant="outline" onClick={onDeny}>
                  {t("deny")}
                </Button>
              </div>
            )}

            {toolUnavailable && <p className="pt-2 text-xs text-muted-foreground">{t("toolUnavailable")}</p>}
          </>
        )}
      </div>
    </div>
  )
}
