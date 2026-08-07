import { create } from "zustand"

export interface ListState<T> {
  rows: T[]
  loading: boolean
  forbidden: boolean
  load: () => Promise<void>
  upsert: (row: T) => void
}

export function createListStore<T extends { id: string }>({ fetchUrl }: { fetchUrl: string }) {
  return create<ListState<T>>()((set) => ({
    rows: [],
    loading: true,
    forbidden: false,
    load: async () => {
      set({ loading: true })
      const res = await fetch(fetchUrl)
      if (res.status === 403) {
        set({ forbidden: true, loading: false })
        return
      }
      const rows = (await res.json()) as T[]
      set({ rows, loading: false })
    },
    upsert: (row) =>
      set((state) => {
        const existing = state.rows.some((r) => r.id === row.id)
        return {
          rows: existing
            ? state.rows.map((r) => (r.id === row.id ? row : r))
            : [row, ...state.rows],
        }
      }),
  }))
}
