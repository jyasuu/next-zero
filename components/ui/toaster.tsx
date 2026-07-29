"use client"

import { useToast, type Toast } from "@/hooks/use-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-md border p-4 shadow-lg",
        toast.variant === "destructive" && "border-destructive/50 bg-destructive text-destructive-foreground",
        toast.variant === "success" && "border-emerald-500/50 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
        (!toast.variant || toast.variant === "default") && "bg-background text-foreground"
      )}
    >
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && <p className="mt-1 text-sm opacity-90">{toast.description}</p>}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  )
}
