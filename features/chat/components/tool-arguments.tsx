"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { formatValue, isPlainObject, keyValueGrid, prettyJson, type RowLike } from "@/features/chat/components/format"
import { parseToolInput } from "@/features/chat/lib/parts"

function isEmptyArgs(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

function renderArgs(value: unknown): ReactNode {
  if (isPlainObject(value)) return keyValueGrid(value)
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-2 text-xs">
        {value.map((item, index) => (
          <li key={index}>{isPlainObject(item) ? keyValueGrid(item as RowLike) : formatValue(item)}</li>
        ))}
      </ul>
    )
  }
  return <p className="text-xs font-medium">{String(value)}</p>
}

export function ToolArguments({ input }: { input: unknown }) {
  const args = parseToolInput(input)
  const [showRaw, setShowRaw] = useState(false)
  if (isEmptyArgs(args)) return null
  return (
    <div className="space-y-2">
      {renderArgs(args)}
      <button
        type="button"
        onClick={() => setShowRaw((open) => !open)}
        className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={showRaw}
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showRaw ? "rotate-180" : ""}`} />
        {showRaw ? "Hide details" : "Show details"}
      </button>
      {showRaw && (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background p-2 text-xs text-muted-foreground">
          {prettyJson(args)}
        </pre>
      )}
    </div>
  )
}
