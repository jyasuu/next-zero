export type NotificationCategory = "chat" | "system"

export interface BrowserNotificationPreferences {
  enabled: boolean
  categories: Record<NotificationCategory, boolean>
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const PREFERENCES_KEY = "browser-notifications:prefs"

export const DEFAULT_PREFERENCES: BrowserNotificationPreferences = {
  enabled: false,
  categories: { chat: true, system: true },
}

export function readPreferences(storage: StorageLike): BrowserNotificationPreferences {
  const raw = storage.getItem(PREFERENCES_KEY)
  if (!raw) return DEFAULT_PREFERENCES
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_PREFERENCES
  }
  if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFERENCES
  const record = parsed as Record<string, unknown>
  const enabled = typeof record.enabled === "boolean" ? record.enabled : DEFAULT_PREFERENCES.enabled
  const categories = { ...DEFAULT_PREFERENCES.categories }
  if (typeof record.categories === "object" && record.categories !== null) {
    const stored = record.categories as Record<string, unknown>
    for (const category of Object.keys(categories) as NotificationCategory[]) {
      if (typeof stored[category] === "boolean") categories[category] = stored[category]
    }
  }
  return { enabled, categories }
}

export function writePreferences(storage: StorageLike, preferences: BrowserNotificationPreferences): void {
  storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}

export function setEnabled(preferences: BrowserNotificationPreferences, enabled: boolean): BrowserNotificationPreferences {
  return { ...preferences, enabled }
}

export function setCategory(
  preferences: BrowserNotificationPreferences,
  category: NotificationCategory,
  enabled: boolean
): BrowserNotificationPreferences {
  return { ...preferences, categories: { ...preferences.categories, [category]: enabled } }
}
