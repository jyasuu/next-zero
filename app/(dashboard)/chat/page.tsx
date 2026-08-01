import { getTranslations } from "next-intl/server"
import { ChatPanel } from "@/features/chat/components/chat-panel"

export const dynamic = "force-dynamic"

export default async function ChatPage() {
  const t = await getTranslations("chat")

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-background">
        <ChatPanel />
      </div>
    </div>
  )
}
