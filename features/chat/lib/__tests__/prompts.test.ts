import { describe, it, expect } from "vitest"
import type { RolePolicies } from "@/lib/acl"
import { listGrantedActions, buildSystemPrompt } from "@/features/chat/lib/prompts"
import type { SerializedChatTool } from "@/features/chat/types"

const adminRole: RolePolicies = {
  permissions: ["read", "write", "delete", "manage_users", "manage_roles"],
}

const editorRole: RolePolicies = {
  policies: [
    {
      Version: "1",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "dashboard:Read",
            "users:Read",
            "audit:Read",
            "reports:Read",
            "settings:Read",
            "notifications:Read",
          ],
        },
      ],
    },
  ],
}

const viewerRole: RolePolicies = {
  policies: [
    {
      Version: "1",
      Statement: [
        { Effect: "Allow", Action: ["dashboard:Read", "reports:Read"] },
      ],
    },
  ],
}

const listUsersTool: SerializedChatTool = {
  id: "users_list",
  name: "List users",
  description: "Lists all users in the workspace",
  inputSchema: {},
  approval: "auto",
}

const createUserTool: SerializedChatTool = {
  id: "users_create",
  name: "Create user",
  description: "Creates a new user",
  inputSchema: {},
  approval: "always",
}

describe("listGrantedActions", () => {
  it("grants every known action to an admin", () => {
    const actions = listGrantedActions(adminRole, true)
    expect(actions).toContain("users:Read")
    expect(actions).toContain("users:Delete")
    expect(actions).toContain("reports:Export")
  })

  it("lists only the viewer's granted actions", () => {
    const actions = listGrantedActions(viewerRole, false)
    expect(actions).toEqual(["dashboard:Read", "reports:Read"])
  })

  it("lists only the editor's granted actions", () => {
    const actions = listGrantedActions(editorRole, false)
    expect(actions).toContain("users:Read")
    expect(actions).toContain("audit:Read")
    expect(actions).not.toContain("users:Create")
    expect(actions).not.toContain("roles:Manage")
  })

  it("grants nothing for an empty role", () => {
    expect(listGrantedActions({ permissions: [] }, false)).toEqual([])
  })
})

describe("buildSystemPrompt", () => {
  const base = {
    email: "ada@example.com",
    roleName: "Viewer",
    isAdmin: false,
    granted: ["dashboard:Read", "reports:Read"],
    customPrompt: "",
    tools: [listUsersTool, createUserTool],
  }

  it("injects the caller identity and role", () => {
    const prompt = buildSystemPrompt(base)
    expect(prompt).toContain("ada@example.com")
    expect(prompt).toContain("Viewer")
  })

  it("lists the granted permissions", () => {
    const prompt = buildSystemPrompt(base)
    expect(prompt).toContain("dashboard:Read")
    expect(prompt).toContain("reports:Read")
  })

  it("describes every active tool with id, name and approval policy", () => {
    const prompt = buildSystemPrompt(base)
    expect(prompt).toContain("users_list")
    expect(prompt).toContain("List users")
    expect(prompt).toContain("users_create")
    expect(prompt).toContain("Create user")
    expect(prompt).toContain("auto")
    expect(prompt).toContain("always")
  })

  it("appends the custom prompt when set", () => {
    const prompt = buildSystemPrompt({ ...base, customPrompt: "Always answer in French." })
    expect(prompt).toContain("Always answer in French.")
  })

  it("does not add a custom prompt section when empty", () => {
    const prompt = buildSystemPrompt(base)
    expect(prompt).not.toContain("Custom user instructions")
  })

  it("instructs the assistant not to exceed the granted permissions", () => {
    const prompt = buildSystemPrompt(base)
    expect(prompt).toMatch(/never exceed|permissions above/i)
  })

  it("notes that write tools require approval", () => {
    const prompt = buildSystemPrompt(base)
    expect(prompt).toMatch(/approval/i)
  })
})
