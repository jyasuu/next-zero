import { getTranslations } from "next-intl/server"
import { MetricsCards } from "@/features/dashboard/components/metrics-cards"
import { ActivityFeed } from "@/features/dashboard/components/activity-feed"
import { Charts } from "@/features/dashboard/components/charts"

export default async function DashboardPage() {
  const t = await getTranslations("dashboard")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("overview")}</p>
      </div>
      <MetricsCards />
      <Charts />
      <ActivityFeed />
    </div>
  )
}
