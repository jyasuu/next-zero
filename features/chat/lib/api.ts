export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number }

export async function fetchApi<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = (body as { error?: unknown } | null)?.error
    return {
      ok: false,
      error: typeof message === "string" ? message : `Request failed (${res.status})`,
      status: res.status,
    }
  }
  return { ok: true, data: (await res.json()) as T }
}
