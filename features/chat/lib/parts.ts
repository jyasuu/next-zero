export type ToolPartState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied"

export interface ToolPartLike {
  type: string
  toolCallId: string
  state: ToolPartState
  input?: unknown
  output?: unknown
  errorText?: string
}

export function isToolPart(part: unknown): part is ToolPartLike {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    typeof (part as { type: unknown }).type === "string" &&
    ((part as { type: string }).type.startsWith("tool-") ||
      (part as { type: string }).type === "dynamic-tool")
  )
}

export function toolNameFromPart(part: { type: string; toolName?: string }): string | null {
  if (part.type === "dynamic-tool") {
    return part.toolName ?? null
  }
  if (part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length)
  }
  return null
}

export function parseToolInput(input: unknown): unknown {
  if (typeof input === "string") {
    try {
      return JSON.parse(input)
    } catch {
      return input
    }
  }
  return input
}

export function isOutputError(part: ToolPartLike): boolean {
  return part.state === "output-error"
}

export function dedupeToolParts<T>(parts: readonly T[], seen: Set<string> = new Set<string>()): T[] {
  const result: T[] = []
  for (const part of parts) {
    if (
      typeof part === "object" &&
      part !== null &&
      "toolCallId" in part &&
      typeof (part as { toolCallId?: unknown }).toolCallId === "string"
    ) {
      const toolCallId = (part as { toolCallId: string }).toolCallId
      if (seen.has(toolCallId)) continue
      seen.add(toolCallId)
    }
    result.push(part)
  }
  return result
}

export function dedupeToolPartsAcrossMessages<T extends { parts: readonly unknown[] }>(
  messages: readonly T[]
): T[] {
  const seen = new Set<string>()
  return messages.map((message) => ({ ...message, parts: dedupeToolParts(message.parts, seen) }))
}

export function isEmptyTextPart(part: unknown): boolean {
  if (typeof part !== "object" || part === null) return false
  const { type, text } = part as { type?: unknown; text?: unknown }
  return type === "text" && (typeof text !== "string" || text.trim().length === 0)
}

export function filterEmptyTextParts<T extends { parts: readonly unknown[] }>(
  messages: readonly T[]
): T[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.filter((part) => !isEmptyTextPart(part)),
  }))
}

export function isOutputAvailable(part: ToolPartLike): boolean {
  return part.state === "output-available"
}
