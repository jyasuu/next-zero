"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarCollapsed: boolean
  theme: "light" | "dark" | "system"
  sidebarCollapsedChanged: (collapsed: boolean) => void
  setTheme: (theme: "light" | "dark" | "system") => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: "system",
      sidebarCollapsedChanged: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "ui-store",
    }
  )
)
