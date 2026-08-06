import { fetchApi } from "@/features/chat/lib/api"

export type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<FetchResult<T>> {
  const res = await fetchApi<T>(url, init)
  if (res.ok) return { ok: true, data: res.data }
  if (res.status === 403) {
    return { ok: false, error: "Forbidden: your role does not grant this action." }
  }
  return { ok: false, error: res.error }
}
