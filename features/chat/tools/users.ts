import { z } from "zod"
import { fetchApi } from "@/features/chat/lib/api"
import type { ChatTool, UserRow } from "@/features/chat/types"

type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function fetchJson<T>(url: string, init?: RequestInit): Promise<FetchResult<T>> {
  const res = await fetchApi<T>(url, init)
  if (res.ok) return { ok: true, data: res.data }
  if (res.status === 403) {
    return { ok: false, error: "Forbidden: your role does not grant this action." }
  }
  return { ok: false, error: res.error }
}

export const usersTools: ChatTool[] = [
  {
    id: "users_list",
    name: "List users",
    description: "Lists all users in the workspace.",
    inputSchema: z.object({}),
    approval: "auto",
    execute: async () => fetchJson<UserRow[]>("/api/users"),
  },
  {
    id: "users_get",
    name: "Get user",
    description: "Returns a single user by id.",
    inputSchema: z.object({ id: z.string().min(1, "id is required") }),
    approval: "auto",
    execute: async (args) => {
      const { id } = args as { id: string }
      return fetchJson<UserRow>(`/api/users/${encodeURIComponent(id)}`)
    },
  },
  {
    id: "users_create",
    name: "Create user",
    description: "Creates a new user with a name, email, role, and status.",
    inputSchema: z.object({
      name: z.string().min(1, "name is required"),
      email: z.string().email("email must be a valid email"),
      role: z.string().min(1, "role is required"),
      status: z.enum(["active", "inactive"]).optional(),
    }),
    approval: "always",
    execute: async (args) => {
      const { name, email, role, status } = args as {
        name: string
        email: string
        role: string
        status?: string
      }
      return fetchJson<UserRow>("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, role, status }),
      })
    },
  },
  {
    id: "users_update",
    name: "Update user",
    description: "Updates a user's name, email, role, or status by id.",
    inputSchema: z.object({
      id: z.string().min(1, "id is required"),
      name: z.string().min(1, "name is required"),
      email: z.string().email("email must be a valid email"),
      role: z.string().min(1, "role is required"),
      status: z.enum(["active", "inactive"]).optional(),
    }),
    approval: "always",
    execute: async (args) => {
      const { id, name, email, role, status } = args as {
        id: string
        name: string
        email: string
        role: string
        status?: string
      }
      return fetchJson<UserRow>(`/api/users/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ name, email, role, status }),
      })
    },
  },
  {
    id: "users_delete",
    name: "Delete user",
    description: "Deletes a user by id.",
    inputSchema: z.object({ id: z.string().min(1, "id is required") }),
    approval: "always",
    execute: async (args) => {
      const { id } = args as { id: string }
      return fetchJson<{ success: true }>(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" })
    },
  },
]
