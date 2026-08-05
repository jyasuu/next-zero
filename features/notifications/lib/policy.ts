import type { BrowserNotificationPreferences, NotificationCategory } from "@/features/notifications/lib/preferences"

export interface ShouldNotifyInput {
  supported: boolean
  permission: NotificationPermission
  preferences: BrowserNotificationPreferences
  category: NotificationCategory
  documentHidden: boolean
  requireHidden?: boolean
}

export function shouldNotify(input: ShouldNotifyInput): boolean {
  const { supported, permission, preferences, category, documentHidden, requireHidden = false } = input
  if (!supported) return false
  if (permission !== "granted") return false
  if (!preferences.enabled) return false
  if (!preferences.categories[category]) return false
  if (requireHidden && !documentHidden) return false
  return true
}
