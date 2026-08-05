import { describe, it, expect } from "vitest"
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  readPreferences,
  writePreferences,
  setCategory,
  setEnabled,
  type BrowserNotificationPreferences,
  type StorageLike,
} from "@/features/notifications/lib/preferences"

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
  }
}

describe("browser notification preferences", () => {
  it("returns defaults when storage is empty", () => {
    expect(readPreferences(memoryStorage())).toEqual(DEFAULT_PREFERENCES)
  })

  it("returns defaults when the stored value is corrupt JSON", () => {
    const storage = memoryStorage({ [PREFERENCES_KEY]: "{ not json" })
    expect(readPreferences(storage)).toEqual(DEFAULT_PREFERENCES)
  })

  it("falls back per-field when values have the wrong type", () => {
    const storage = memoryStorage({
      [PREFERENCES_KEY]: JSON.stringify({ enabled: "yes", categories: { chat: true } }),
    })
    const prefs = readPreferences(storage)
    expect(prefs.enabled).toBe(false)
    expect(prefs.categories.chat).toBe(true)
    expect(prefs.categories.system).toBe(true)
  })

  it("round-trips written preferences", () => {
    const storage = memoryStorage()
    const custom: BrowserNotificationPreferences = {
      enabled: true,
      categories: { chat: false, system: true },
    }
    writePreferences(storage, custom)
    expect(readPreferences(storage)).toEqual(custom)
  })

  it("setEnabled returns a new object with only the enabled flag changed", () => {
    const before = { enabled: false, categories: { chat: true, system: true } }
    const after = setEnabled(before, true)
    expect(after).toEqual({ enabled: true, categories: { chat: true, system: true } })
    expect(after).not.toBe(before)
  })

  it("setCategory updates one category and leaves the other intact", () => {
    const before = { enabled: true, categories: { chat: true, system: true } }
    const after = setCategory(before, "chat", false)
    expect(after.categories).toEqual({ chat: false, system: true })
    expect(after).not.toBe(before)
    expect(before.categories.chat).toBe(true)
  })
})
