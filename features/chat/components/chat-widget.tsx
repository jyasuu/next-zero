"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { MessageSquare, X } from "lucide-react"
import { useChatStore } from "@/stores/chat-store"
import { ChatPanel } from "@/features/chat/components/chat-panel"

export function ChatWidget() {
  const { widgetOpen, widgetOpenChanged } = useChatStore()
  const t = useTranslations("chat")
  const pathname = usePathname()

  if (pathname === "/chat") return null

  return (
    <>
      {widgetOpen && (
        <div className="fixed bottom-24 left-6 z-50 flex h-[600px] max-h-[calc(100vh-8rem)] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <ChatPanel />
        </div>
      )}
      <button
        type="button"
        onClick={() => widgetOpenChanged(!widgetOpen)}
        aria-label={t("toggle")}
        className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {widgetOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </>
  )
}
