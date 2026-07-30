import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockActivities } from "../types"

export async function ActivityFeed() {
  const t = await getTranslations("dashboard")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user}</span>
                  {" "}{activity.action}{" "}
                  <span className="text-muted-foreground">{activity.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {activity.action}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
