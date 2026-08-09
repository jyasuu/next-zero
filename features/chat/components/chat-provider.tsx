"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai"
import { useChat } from "@ai-sdk/react"
import { useTranslations } from "next-intl"
import { useChatStore } from "@/stores/chat-store"
import { mergeTools, type ToolScopeRegistration } from "@/features/chat/lib/scopes"
import { serializeTool } from "@/features/chat/lib/serialize"
import { fetchApi } from "@/features/chat/lib/api"
import { dedupeToolPartsAcrossMessages, filterEmptyTextParts } from "@/features/chat/lib/parts"
import { globalTools } from "@/features/chat/tools/global"
import type { ChatSession, ChatTool, SerializedChatTool } from "@/features/chat/types"
import { useBrowserNotifications } from "@/features/notifications/hooks/use-browser-notifications"

export type ChatStatus = "submitted" | "streaming" | "ready" | "error"

interface ChatProviderValue {
  messages: UIMessage[]
  sendMessage: (text: string) => void
  status: ChatStatus
  error: Error | undefined
  stop: () => Promise<void>
  setMessages: (messages: UIMessage[]) => void
  addToolOutput: ReturnType<typeof useChat>["addToolOutput"]
  tools: ChatTool[]
  disabled: boolean
  sessions: ChatSession[]
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
  refreshSessions: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
  registerScope: (registration: ToolScopeRegistration) => void
  unregisterScope: (id: string) => void
}

const ChatContext = createContext<ChatProviderValue | null>(null)

export function useChatProvider() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatProvider must be used within ChatProvider")
  }
  return context
}

interface ApiError extends Error {
  status: number
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && typeof (error as ApiError).status === "number"
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetchApi<T>(url, init)
  if (res.ok) return res.data
  const message =
    res.status === 403 ? "Forbidden" : res.status === 503 ? "Disabled" : `Request failed (${res.status})`
  const error = new Error(message) as ApiError
  error.status = res.status
  throw error
}

function toolRegistryToSerialized(registry: ToolScopeRegistration[]): SerializedChatTool[] {
  return mergeTools(globalTools, registry).map(serializeTool)
}

interface ChatProviderProps {
  children: ReactNode
  claims: { email: string; role: string; isAdmin: boolean } | null
}

export function ChatProvider({ children, claims }: ChatProviderProps) {
  const t = useTranslations("notifications")
  const { notifyChatTurnFinished } = useBrowserNotifications()
  const registryRef = useRef<ToolScopeRegistration[]>([])
  const [registryVersion, setRegistryVersion] = useState(0)
  const [disabled, setDisabled] = useState(false)

  const { sessions, activeSessionId, setSessions, upsertSession, setActiveSessionId, setClaims, removeSession } =
    useChatStore()

  useEffect(() => {
    setClaims(claims)
  }, [claims, setClaims])

  const registerScope = useCallback((registration: ToolScopeRegistration) => {
    registryRef.current = [...registryRef.current.filter((r) => r.id !== registration.id), registration]
    setRegistryVersion((v) => v + 1)
  }, [])

  const unregisterScope = useCallback((id: string) => {
    registryRef.current = registryRef.current.filter((r) => r.id !== id)
    setRegistryVersion((v) => v + 1)
  }, [])

  const refreshSessions = useCallback(async () => {
    try {
      const list = await apiJson<ChatSession[]>("/api/chat/sessions")
      setSessions(list)
      const active = useChatStore.getState().activeSessionId
      if (active && !list.some((s) => s.id === active)) {
        setActiveSessionId(null)
      }
      setDisabled(false)
    } catch (error) {
      if (error instanceof Error && error.message === "Disabled") {
        setDisabled(true)
      }
    }
  }, [setSessions, setActiveSessionId])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const activeSessionIdRef = useRef(activeSessionId)
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  const { messages, sendMessage, status, error, stop, setMessages, addToolOutput } = useChat({
    id: "shared-chat",
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ body, messages: msgs, id }) => {
        let sessionId = useChatStore.getState().activeSessionId
        if (!sessionId) {
          const created = await apiJson<ChatSession>("/api/chat/sessions", { method: "POST" })
          upsertSession(created)
          setActiveSessionId(created.id)
          sessionId = created.id
        }
        return {
          body: {
            ...body,
            id,
            messages: filterEmptyTextParts(dedupeToolPartsAcrossMessages(msgs)),
            sessionId,
            tools: toolRegistryToSerialized(registryRef.current),
          },
        }
      },
    }),
    onError: (err) => {
      console.error("Chat request failed:", err)
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: async ({ messages: msgs }) => {
      const sessionId = useChatStore.getState().activeSessionId
      const persist = async (id: string): Promise<boolean> => {
        try {
          const updated = await apiJson<ChatSession>(
            `/api/chat/sessions/${id}/messages`,
            { method: "POST", body: JSON.stringify({ messages: filterEmptyTextParts(dedupeToolPartsAcrossMessages(msgs)) }) }
          )
          upsertSession(updated)
          return true
        } catch (error) {
          if (isApiError(error) && error.status === 404) return false
          throw error
        }
      }
      if (sessionId) {
        try {
          if (!(await persist(sessionId))) {
            const created = await apiJson<ChatSession>("/api/chat/sessions", { method: "POST" })
            upsertSession(created)
            setActiveSessionId(created.id)
            await persist(created.id)
          }
        } catch (error) {
          console.error("Failed to persist chat messages:", error)
        }
      }
      notifyChatTurnFinished(msgs, tools, {
        finishedTitle: t("browser.chat.finishedTitle"),
        finishedBody: t("browser.chat.finishedBody"),
        waitingTitle: t("browser.chat.waitingTitle"),
        waitingBody: t("browser.chat.waitingBody"),
      })
    },
  })

  const selectSession = useCallback(
    async (id: string | null) => {
      setActiveSessionId(id)
      if (!id) {
        setMessages([])
        return
      }
      try {
        const restored = await apiJson<UIMessage[]>(`/api/chat/sessions/${id}/messages`)
        setMessages(restored)
      } catch (error) {
        setMessages([])
        if (isApiError(error) && error.status === 404) {
          removeSession(id)
          if (activeSessionIdRef.current === id) setActiveSessionId(null)
        }
      }
    },
    [setActiveSessionId, setMessages, removeSession]
  )

  const deleteSession = useCallback(
    async (id: string) => {
      await apiJson(`/api/chat/sessions/${id}`, { method: "DELETE" })
      removeSession(id)
      if (activeSessionIdRef.current === id) {
        setActiveSessionId(null)
        setMessages([])
      }
    },
    [removeSession, setActiveSessionId, setMessages]
  )

  const tools = useMemo(
    () => mergeTools(globalTools, registryRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registryVersion]
  )

  const value = useMemo<ChatProviderValue>(
    () => ({
      messages,
      sendMessage: (text) => sendMessage({ text }),
      status: status as ChatStatus,
      error,
      stop,
      setMessages,
      addToolOutput,
      tools,
      disabled,
      sessions,
      activeSessionId,
      setActiveSessionId: selectSession,
      refreshSessions,
      deleteSession,
      registerScope,
      unregisterScope,
    }),
    [messages, sendMessage, status, error, stop, setMessages, addToolOutput, tools, disabled, sessions, activeSessionId, selectSession, refreshSessions, deleteSession, registerScope, unregisterScope]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
