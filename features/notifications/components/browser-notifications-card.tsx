"use client"

import { BellRing } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useBrowserNotifications } from "@/features/notifications/hooks/use-browser-notifications"
import type { NotificationCategory } from "@/features/notifications/lib/preferences"

const CATEGORY_KEYS: NotificationCategory[] = ["chat", "system"]

export function BrowserNotificationsCard() {
  const t = useTranslations("notifications")
  const {
    supported,
    permission,
    preferences,
    requestPermission,
    setEnabled,
    setCategoryEnabled,
    notify,
  } = useBrowserNotifications()

  const status = !supported
    ? t("browser.unavailable")
    : permission === "denied"
      ? t("browser.denied")
      : permission === "granted"
        ? t("browser.granted")
        : t("browser.permissionNotRequested")

  const toggleEnabled = async (checked: boolean) => {
    if (!checked) {
      setEnabled(false)
      return
    }
    const next = await requestPermission()
    if (next === "granted") setEnabled(true)
  }

  const disabled = !supported || !preferences.enabled

  const sendTest = () => {
    for (const category of CATEGORY_KEYS) {
      if (!preferences.categories[category]) continue
      notify(category, {
        title: t("browser.testTitle"),
        body: t("browser.testBody", { category: t(`browser.categories.${category}`) }),
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("browser.title")}</CardTitle>
        <CardDescription>{t("browser.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="browser-notifications-enabled">{t("browser.enable")}</Label>
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
          <Switch
            id="browser-notifications-enabled"
            checked={preferences.enabled}
            disabled={!supported}
            onCheckedChange={toggleEnabled}
          />
        </div>
        <div className="space-y-2">
          {CATEGORY_KEYS.map((category) => (
            <div key={category} className="flex items-center gap-2">
              <Checkbox
                id={`browser-notification-${category}`}
                checked={preferences.categories[category]}
                disabled={disabled}
                onCheckedChange={(checked) => setCategoryEnabled(category, checked === true)}
              />
              <Label htmlFor={`browser-notification-${category}`}>
                {t(`browser.categories.${category}`)}
              </Label>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" disabled={disabled} onClick={sendTest}>
          <BellRing className="mr-2 h-4 w-4" />
          {t("browser.test")}
        </Button>
      </CardContent>
    </Card>
  )
}
