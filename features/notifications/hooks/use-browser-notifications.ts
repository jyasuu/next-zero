"use client"

import { useCallback, useMemo, useState } from "react"
import type { UIMessage } from "ai"
import type { ChatTool } from "@/features/chat/types"
import { buildChatNotification } from "@/features/notifications/lib/chat"
import {
  DEFAULT_PREFERENCES,
  readPreferences,
  setCategory,
  setEnabled,
  writePreferences,
  type BrowserNotificationPreferences,
  type NotificationCategory,
} from "@/features/notifications/lib/preferences"
import { shouldNotify } from "@/features/notifications/lib/policy"
import {
  isNotificationSupported,
  permissionState,
  requestPermission,
} from "@/features/notifications/lib/support"

export interface BrowserNotificationPayload {
  title: string
  body?: string
  tag?: string
}

export interface ChatTurnStrings {
  finishedTitle: string
  finishedBody: string
  waitingTitle: string
  waitingBody: string
}

export interface BrowserNotificationsApi {
  supported: boolean
  permission: NotificationPermission
  preferences: BrowserNotificationPreferences
  requestPermission: () => Promise<NotificationPermission>
  setEnabled: (enabled: boolean) => void
  setCategoryEnabled: (category: NotificationCategory, enabled: boolean) => void
  notify: (category: NotificationCategory, payload: BrowserNotificationPayload) => boolean
  notifyChatTurnFinished: (messages: UIMessage[], tools: ChatTool[], strings: ChatTurnStrings) => boolean
}

function initialPreferences(): BrowserNotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  return readPreferences(window.localStorage)
}

function showNotification(payload: BrowserNotificationPayload): void {
  new Notification(payload.title, { body: payload.body, tag: payload.tag })
}

export function useBrowserNotifications(): BrowserNotificationsApi {
  const [supported] = useState<boolean>(() => isNotificationSupported())
  const [permission, setPermission] = useState<NotificationPermission>(() => permissionState())
  const [preferences, setPreferences] = useState<BrowserNotificationPreferences>(initialPreferences)

  const updatePreferences = useCallback((updater: (prev: BrowserNotificationPreferences) => BrowserNotificationPreferences) => {
    setPreferences((prev) => {
      const next = updater(prev)
      if (typeof window !== "undefined") writePreferences(window.localStorage, next)
      return next
    })
  }, [])

  const canNotify = useCallback(
    (category: NotificationCategory, requireHidden: boolean): boolean => {
      if (typeof window === "undefined") return false
      return shouldNotify({
        supported,
        permission,
        preferences,
        category,
        documentHidden: document.hidden,
        requireHidden,
      })
    },
    [supported, permission, preferences]
  )

  const notify = useCallback(
    (category: NotificationCategory, payload: BrowserNotificationPayload): boolean => {
      if (!canNotify(category, false)) return false
      showNotification(payload)
      return true
    },
    [canNotify]
  )

  const notifyChatTurnFinished = useCallback(
    (messages: UIMessage[], tools: ChatTool[], strings: ChatTurnStrings): boolean => {
      const { variant, body } = buildChatNotification(messages, tools)
      const awaitingApproval = variant === "awaitingApproval"
      const payload: BrowserNotificationPayload = {
        title: awaitingApproval ? strings.waitingTitle : strings.finishedTitle,
        body: awaitingApproval ? strings.waitingBody : body || strings.finishedBody,
      }
      if (!canNotify("chat", true)) return false
      showNotification(payload)
      return true
    },
    [canNotify]
  )

  const handleRequestPermission = useCallback(async () => {
    const next = await requestPermission()
    setPermission(next)
    return next
  }, [])

  const api = useMemo<BrowserNotificationsApi>(
    () => ({
      supported,
      permission,
      preferences,
      requestPermission: handleRequestPermission,
      setEnabled: (enabled) => updatePreferences((prev) => setEnabled(prev, enabled)),
      setCategoryEnabled: (category, enabled) => updatePreferences((prev) => setCategory(prev, category, enabled)),
      notify,
      notifyChatTurnFinished,
    }),
    [supported, permission, preferences, handleRequestPermission, updatePreferences, notify, notifyChatTurnFinished]
  )

  return api
}
