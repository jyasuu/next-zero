"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChatSession } from "@/features/chat/types"

export interface ChatClaims {
  email: string
  role: string
  isAdmin: boolean
}

interface ChatState {
  widgetOpen: boolean
  sessions: ChatSession[]
  activeSessionId: string | null
  claims: ChatClaims | null
  widgetOpenChanged: (open: boolean) => void
  setSessions: (sessions: ChatSession[]) => void
  upsertSession: (session: ChatSession) => void
  removeSession: (id: string) => void
  setActiveSessionId: (id: string | null) => void
  setClaims: (claims: ChatClaims | null) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      widgetOpen: false,
      sessions: [],
      activeSessionId: null,
      claims: null,
      widgetOpenChanged: (open) => set({ widgetOpen: open }),
      setSessions: (sessions) => set({ sessions }),
      upsertSession: (session) =>
        set((state) => {
          const existing = state.sessions.some((s) => s.id === session.id)
          return {
            sessions: existing
              ? state.sessions.map((s) => (s.id === session.id ? session : s))
              : [session, ...state.sessions],
          }
        }),
      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        })),
      setActiveSessionId: (id) => set({ activeSessionId: id }),
      setClaims: (claims) => set({ claims }),
    }),
    {
      name: "chat-session",
      partialize: (state) => ({
        widgetOpen: state.widgetOpen,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
)
