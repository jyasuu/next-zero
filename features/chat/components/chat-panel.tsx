"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { MessageSquare, Plus, Send, Square, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useChatProvider } from "@/features/chat/components/chat-provider"
import { Markdown, CopyButton } from "@/features/chat/components/markdown"
import { ToolCard } from "@/features/chat/components/tool-card"
import {
  isToolPart,
  parseToolInput,
  toolNameFromPart,
  type ToolPartLike,
} from "@/features/chat/lib/parts"
import { validateToolArgs, shouldRequireApproval } from "@/features/chat/lib/approval"
import { autoApplyFormFillResult } from "@/features/chat/lib/form-fill"
import type { ChatTool, ToolExecutionResult } from "@/features/chat/types"
import { useFormFillStore } from "@/stores/form-fill-store"

export function ChatPanel() {
  const t = useTranslations("chat")
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    addToolOutput,
    tools,
    disabled,
    sessions,
    activeSessionId,
    setActiveSessionId,
    deleteSession,
  } = useChatProvider()

  const [input, setInput] = useState("")
  const processedRef = useRef<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  const autoApplyWhenValid = useFormFillStore((s) => s.autoApplyWhenValid)
  const setAutoApplyWhenValid = useFormFillStore((s) => s.setAutoApplyWhenValid)
  const hasAnyApplyHandler = useFormFillStore((s) => s.hasAnyApplyHandler)

  const executeTool = async (tool: ChatTool, part: ToolPartLike) => {
    const args = parseToolInput(part.input)
    const validated = validateToolArgs(tool.inputSchema, args)
    let result: ToolExecutionResult
    if (!validated.ok) {
      result = { ok: false, error: validated.error }
    } else {
      try {
        result = await tool.execute(validated.args)
      } catch (e) {
        result = { ok: false, error: e instanceof Error ? e.message : "Tool execution failed" }
      }
    }
    if (result.ok) {
      addToolOutput({
        tool: tool.id,
        toolCallId: part.toolCallId,
        state: "output-available",
        output: result.data ?? { ok: true },
      })
      autoApplyFormFillResult(tool.id, result.data)
    } else {
      addToolOutput({
        tool: tool.id,
        toolCallId: part.toolCallId,
        state: "output-error",
        errorText: result.error,
      })
    }
  }

  useEffect(() => {
    if (status !== "ready") return
    for (const message of messages) {
      if (message.role !== "assistant") continue
      for (const part of message.parts) {
        if (!isToolPart(part) || part.state !== "input-available") continue
        const toolId = toolNameFromPart(part)
        if (!toolId || processedRef.current.has(part.toolCallId)) continue
        const tool = tools.find((x) => x.id === toolId)
        if (!tool || shouldRequireApproval(tool)) continue
        processedRef.current.add(part.toolCallId)
        void executeTool(tool, part)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status, tools])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, status])

  const approve = (tool: ChatTool | undefined, part: ToolPartLike) => {
    if (!tool) return
    processedRef.current.add(part.toolCallId)
    void executeTool(tool, part)
  }

  const deny = (part: ToolPartLike) => {
    const toolId = toolNameFromPart(part)
    if (!toolId) return
    processedRef.current.add(part.toolCallId)
    addToolOutput({
      tool: toolId,
      toolCallId: part.toolCallId,
      state: "output-error",
      errorText: t("deniedMessage"),
    })
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || status === "streaming" || status === "submitted" || disabled) return
    sendMessage(text)
    setInput("")
  }

  const newChat = () => {
    setActiveSessionId(null)
    setMessages([])
    setInput("")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Select
          value={activeSessionId ?? "new"}
          onValueChange={(value) => {
            if (value === "new") newChat()
            else setActiveSessionId(value)
          }}
        >
          <SelectTrigger aria-label={t("selectSession")} className="h-8 w-full min-w-0 text-sm">
            <SelectValue placeholder={t("selectSession")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">{t("newChat")}</SelectItem>
            {sessions.map((session) => (
              <SelectItem key={session.id} value={session.id}>
                {session.title || t("untitled")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasAnyApplyHandler && (
          <div className="flex shrink-0 items-center" title={t("formFill.autoApply")}>
            <Switch
              checked={autoApplyWhenValid}
              onCheckedChange={setAutoApplyWhenValid}
              aria-label={t("formFill.autoApply")}
            />
          </div>
        )}
        <Button variant="ghost" size="icon" aria-label={t("newChat")} onClick={newChat}>
          <Plus className="h-4 w-4" />
        </Button>
        {activeSessionId && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("deleteSession")}
            onClick={() => deleteSession(activeSessionId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm">{t("empty")}</p>
            <p className="text-xs opacity-70">{t("emptyHint")}</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                {message.parts
                  .filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join(" ")}
              </div>
            ) : (
              <div className="group relative max-w-[95%] space-y-3">
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <div key={index} className="relative rounded-2xl bg-muted/60 px-4 py-2.5">
                        <Markdown text={part.text} />
                        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <CopyButton text={part.text} />
                        </div>
                      </div>
                    )
                  }
                  if (isToolPart(part)) {
                    const toolId = toolNameFromPart(part)
                    const tool = tools.find((x) => x.id === toolId)
                    return (
                      <ToolCard
                        key={index}
                        tool={tool}
                        part={part}
                        onApprove={() => approve(tool, part)}
                        onDeny={() => deny(part)}
                      />
                    )
                  }
                  return null
                })}
              </div>
            )}
          </div>
        ))}

        {(status === "submitted" || status === "streaming") && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl bg-muted/60 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]" />
            </div>
          </div>
        )}

        {status === "error" && error && (
          <p className="text-center text-sm text-destructive">{t("requestError")}</p>
        )}

        <div ref={scrollRef} />
      </div>

      <div className="border-t p-3">
        {disabled ? (
          <p className="text-center text-sm text-muted-foreground">{t("disabled")}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onSubmit(e)
                }
              }}
              placeholder={t("placeholder")}
              rows={1}
              className="max-h-32 min-h-10 resize-none"
            />
            {status === "submitted" || status === "streaming" ? (
              <Button type="button" variant="outline" size="icon" aria-label={t("stop")} onClick={() => stop()}>
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()} aria-label={t("send")}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
