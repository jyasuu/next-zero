"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Check, ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  advanceAfterPick,
  buildAnswers,
  createQuestionFlow,
  pickOption,
  setCustom,
  type AdvanceStep,
  type QuestionFlowState,
} from "@/features/chat/lib/question-flow"
import type { QuestionAnswers, QuestionPrompt } from "@/features/chat/types"

interface QuestionCardProps {
  questions: QuestionPrompt[]
  onAnswer: (answers: QuestionAnswers) => void
  onDismiss: () => void
}

function Mark({ multiple, picked }: { multiple: boolean; picked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
        picked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
      }`}
    >
      {multiple ? (
        picked && <Check className="h-3 w-3" />
      ) : (
        <span className={`h-2 w-2 rounded-full ${picked ? "bg-primary" : "bg-transparent"}`} />
      )}
    </span>
  )
}

export function QuestionCard({ questions, onAnswer, onDismiss }: QuestionCardProps) {
  const t = useTranslations("chat")
  const total = questions.length
  const [flow, setFlow] = useState<QuestionFlowState>(() => createQuestionFlow(total))
  const [tab, setTab] = useState(0)
  const [customOpenTab, setCustomOpenTab] = useState<number | null>(null)

  const question = questions[tab]
  const multiple = question.multiple === true
  const hasCustom = question.custom !== false
  const selected = flow.answers[tab] ?? []
  const draft = flow.custom[tab] ?? ""
  const isLast = tab >= total - 1
  const customPicked = draft.trim().length > 0 && selected.includes(draft.trim())

  const go = (step: AdvanceStep) => {
    if (step.kind === "submit") onAnswer(step.answers)
    else if (step.kind === "advance") setTab(step.nextTab)
  }

  const handlePick = (label: string) => {
    const next = pickOption(flow, tab, multiple, label)
    setFlow(next)
    if (!multiple) go(advanceAfterPick(next, tab, total, false))
  }

  const handleCustomChange = (value: string) => {
    setFlow((state) => setCustom(state, tab, multiple, value))
  }

  const commitCustom = () => {
    setCustomOpenTab(null)
    if (!multiple) go(advanceAfterPick(flow, tab, total, false))
  }

  const submit = () => onAnswer(buildAnswers(flow, total))
  const next = () => setTab((current) => Math.min(current + 1, total - 1))
  const back = () => setTab((current) => Math.max(current - 1, 0))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">
          {question.header || t("question.progress", { current: tab + 1, total })}
        </span>
        {total > 1 && (
          <span className="ml-auto flex items-center gap-1">
            {questions.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-3 rounded-full ${
                  index === tab ? "bg-primary" : index < tab ? "bg-primary/40" : "bg-muted"
                }`}
              />
            ))}
          </span>
        )}
      </div>

      <p className="text-sm font-medium">{question.question}</p>

      <div className="space-y-1.5">
        {question.options.map((option, index) => {
          const picked = selected.includes(option.label)
          return (
            <button
              key={index}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={picked}
              onClick={() => handlePick(option.label)}
              className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                picked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
              }`}
            >
              <Mark multiple={multiple} picked={picked} />
              <span className="min-w-0">
                <span className="block font-medium">{option.label}</span>
                {option.description && (
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                )}
              </span>
            </button>
          )
        })}

        {hasCustom && customOpenTab !== tab && (
          <button
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={customPicked}
            onClick={() => setCustomOpenTab(tab)}
            className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm ${
              customPicked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
            }`}
          >
            <Mark multiple={multiple} picked={customPicked} />
            <span className="font-medium">{t("question.typeOwnAnswer")}</span>
          </button>
        )}

        {hasCustom && customOpenTab === tab && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              commitCustom()
            }}
            className="space-y-2 rounded-md border px-3 py-2"
          >
            <span className="text-sm font-medium">{t("question.typeOwnAnswer")}</span>
            <Textarea
              value={draft}
              onChange={(event) => handleCustomChange(event.target.value)}
              placeholder={t("question.placeholder")}
              rows={1}
              autoFocus
              className="min-h-10 resize-none"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                {t("question.done")}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
          {t("question.dismiss")}
        </Button>
        <div className="flex items-center gap-2">
          {tab > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={back}>
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("question.back")}
            </Button>
          )}
          {multiple && (
            <Button type="button" size="sm" onClick={isLast ? submit : next}>
              {isLast ? t("question.submit") : t("question.next")}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
