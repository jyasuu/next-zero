"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const t = useTranslations("settings")
  const [siteName, setSiteName] = useState("Enterprise App")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t("general")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("appearance")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("notifications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t("generalSettings")}</CardTitle>
              <CardDescription>{t("generalSettingsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">{t("siteName")}</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">{t("language")}</Label>
                <Select defaultValue="en">
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{t("timezone")}</Label>
                <Select defaultValue="utc">
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time</SelectItem>
                    <SelectItem value="pst">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>{t("saveChanges")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{t("appearance")}</CardTitle>
              <CardDescription>{t("appearanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("darkMode")}</Label>
                  <p className="text-sm text-muted-foreground">{t("darkModeDesc")}</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("compactMode")}</Label>
                  <p className="text-sm text-muted-foreground">{t("compactModeDesc")}</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t("notificationsDesc")}</CardTitle>
              <CardDescription>{t("notificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("emailNotifications")}</Label>
                  <p className="text-sm text-muted-foreground">{t("emailNotificationsDesc")}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("pushNotifications")}</Label>
                  <p className="text-sm text-muted-foreground">{t("pushNotificationsDesc")}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("systemAlerts")}</Label>
                  <p className="text-sm text-muted-foreground">{t("systemAlertsDesc")}</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
