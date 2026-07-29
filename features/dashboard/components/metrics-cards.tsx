import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { mockMetrics } from "../types"

export function MetricsCards() {
  const metrics = mockMetrics

  const cards = [
    { title: "Total Users", value: metrics.totalUsers.toLocaleString(), change: "+12%" },
    { title: "Active Users", value: metrics.activeUsers.toLocaleString(), change: "+8%" },
    { title: "Revenue", value: metrics.revenue, change: "+23%" },
    { title: "Requests", value: metrics.requests.toLocaleString(), change: "+18%" },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.change} from last month</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
