"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarCollapsed: boolean
  navOpen: boolean
  theme: "light" | "dark" | "system"
  sidebarCollapsedChanged: (collapsed: boolean) => void
  setNavOpen: (open: boolean) => void
  setTheme: (theme: "light" | "dark" | "system") => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      navOpen: false,
      theme: "system",
      sidebarCollapsedChanged: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setNavOpen: (open) => set({ navOpen: open }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "ui-store",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed, theme: state.theme }),
    }
  )
)
