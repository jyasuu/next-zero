"use client"

import { useTranslations } from "next-intl"
import { ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function ForbiddenCard() {
  const t = useTranslations("forbidden")

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">{t("message")}</p>
      </CardContent>
    </Card>
  )
}
