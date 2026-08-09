import { ability, type RolePolicies } from "@/lib/acl"
import { permissionDomains } from "@/lib/constants"
import type { SerializedChatTool } from "@/features/chat/types"
import { formatSkillsAdvertisement, type SkillSummary } from "@/features/skills/lib/skill"

export function listGrantedActions(role: RolePolicies, isAdmin: boolean): string[] {
  const { can } = ability(role, isAdmin)
  const granted: string[] = []
  for (const domain of permissionDomains) {
    for (const action of domain.actions) {
      if (can(action)) granted.push(action)
    }
  }
  return granted
}

export interface SystemPromptInput {
  email: string
  roleName: string
  isAdmin: boolean
  granted: string[]
  customPrompt: string
  tools: SerializedChatTool[]
  skills: SkillSummary[]
}

export function buildSystemPrompt({
  email,
  roleName,
  isAdmin,
  granted,
  customPrompt,
  tools,
  skills,
}: SystemPromptInput): string {
  const toolLines = tools
    .map(
      (tool) =>
        `- ${tool.id} ("${tool.name}"): ${tool.description} [approval: ${tool.approval}]`
    )
    .join("\n")

  const sections = [
    `You are an assistant for an enterprise admin dashboard.`,
    `The current user is ${email} with role "${roleName}"${
      isAdmin ? " (admin, bypasses the ACL)" : ""
    }.`,
    `The user is allowed to perform exactly these actions: ${granted.join(", ") || "none"}.`,
    `Never propose or perform an action the user's permissions above do not cover.`,
    `Tools whose approval policy is "always" execute only after the user approves; "auto" tools run immediately. Always wait for tool results before answering.`,
  ]

  if (tools.length > 0) {
    sections.push(`Available tools:\n${toolLines}`)
  }

  const skillAdvertisement = formatSkillsAdvertisement(skills ?? [])
  if (skillAdvertisement) {
    sections.push(
      `${skillAdvertisement}\nTo follow a workflow, call the skill tool with the name of the matching skill; loading it requires the user's approval.`
    )
  }

  if (customPrompt.trim().length > 0) {
    sections.push(`Custom user instructions:\n${customPrompt.trim()}`)
  }

  return sections.join("\n\n")
}
