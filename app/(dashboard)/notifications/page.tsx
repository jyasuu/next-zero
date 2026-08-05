"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockNotifications } from "@/lib/constants"
import { Check, X } from "lucide-react"
import { BrowserNotificationsCard } from "@/features/notifications/components/browser-notifications-card"

type Notification = (typeof mockNotifications)[0]

export default function NotificationsPage() {
  const t = useTranslations("notifications")
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [filter, setFilter] = useState<string>("all")

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter)

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const typeLabel = (type: string) => {
    switch (type) {
      case "info": return t("types.info")
      case "warning": return t("types.warning")
      case "error": return t("types.error")
      case "success": return t("types.success")
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? t("description", { count: unreadCount }) : t("noUnread")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            {t("markAllRead")}
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            <X className="mr-2 h-4 w-4" />
            {t("clearAll")}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            <SelectItem value="info">{t("types.info")}</SelectItem>
            <SelectItem value="warning">{t("types.warning")}</SelectItem>
            <SelectItem value="error">{t("types.error")}</SelectItem>
            <SelectItem value="success">{t("types.success")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              {t("noNotifications")}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 ${!notification.read ? "bg-muted/50" : ""}`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                      <Badge variant={notification.type === "error" ? "destructive" : notification.type === "warning" ? "warning" : "secondary"}>
                        {typeLabel(notification.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.createdAt}</p>
                  </div>
                  {!notification.read && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                      {t("markRead")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BrowserNotificationsCard />
    </div>
  )
}
