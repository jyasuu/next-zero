export interface ToolPartLike {
  type: string
  toolCallId: string
  state: string
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

export function toolNameFromPart(part: ToolPartLike): string | null {
  if (part.type === "dynamic-tool") {
    return (part as { toolName?: string }).toolName ?? null
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

export function isOutputAvailable(part: ToolPartLike): boolean {
  return part.state === "output-available"
}
