"use client"

import { useState, useCallback } from "react"

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

let toastCount = 0
const listeners: Array<(toast: Toast) => void> = []

export function toast(toast: Omit<Toast, "id">) {
  const id = String(++toastCount)
  const entry: Toast = { ...toast, id }
  listeners.forEach((fn) => fn(entry))
  return id
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id))
    }, 4000)
  }, [])

  useState(() => {
    listeners.push(addToast)
    return () => {
      const idx = listeners.indexOf(addToast)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  })

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, dismiss }
}
