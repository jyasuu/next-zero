"use client"

import { Check, ShieldCheck, ShieldX, Wrench } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { isOutputAvailable, isOutputError, parseToolInput, type ToolPartLike } from "@/features/chat/lib/parts"
import { shouldRequireApproval } from "@/features/chat/lib/approval"
import type { ChatTool } from "@/features/chat/types"

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function summaryOf(output: unknown): string {
  if (output === null || output === undefined) return "Completed"
  if (typeof output === "string") return output.slice(0, 200)
  if (Array.isArray(output)) return `${output.length} item(s)`
  if (typeof output === "object") {
    const obj = output as Record<string, unknown>
    if (obj.ok === true && obj.data === undefined) return "Completed"
    if (obj.data !== undefined) return prettyJson(obj.data).slice(0, 200)
    return prettyJson(output).slice(0, 200)
  }
  return String(output)
}

interface ToolCardProps {
  tool: ChatTool | undefined
  part: ToolPartLike
  onApprove: () => void
  onDeny: () => void
}

export function ToolCard({ tool, part, onApprove, onDeny }: ToolCardProps) {
  const t = useTranslations("chat")
  const name = tool?.name ?? part.type.replace("tool-", "")
  const needsApproval =
    part.state === "input-available" && tool !== undefined && shouldRequireApproval(tool)
  const toolUnavailable = part.state === "input-available" && tool === undefined

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
      </div>

      <div className="px-3 py-2">
        {part.input !== undefined && (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background p-2 text-xs text-muted-foreground">
            {prettyJson(parseToolInput(part.input))}
          </pre>
        )}

        {isOutputAvailable(part) && part.output !== undefined && (
          <p className="pt-2 text-xs text-muted-foreground">{summaryOf(part.output)}</p>
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

        {toolUnavailable && (
          <p className="pt-2 text-xs text-muted-foreground">{t("toolUnavailable")}</p>
        )}
      </div>
    </div>
  )
}
