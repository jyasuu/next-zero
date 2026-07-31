import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function ForbiddenPage() {
  const t = await getTranslations("forbidden")

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("message")}</p>
      <Button asChild>
        <Link href="/dashboard">{t("backToDashboard")}</Link>
      </Button>
    </div>
  )
}
