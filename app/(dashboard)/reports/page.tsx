"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const userData = [
  { month: "Jan", users: 400, active: 320 },
  { month: "Feb", users: 300, active: 240 },
  { month: "Mar", users: 600, active: 480 },
  { month: "Apr", users: 450, active: 360 },
  { month: "May", users: 550, active: 420 },
  { month: "Jun", users: 700, active: 560 },
]

const requestData = [
  { month: "Jan", requests: 2400, errors: 24 },
  { month: "Feb", requests: 1398, errors: 14 },
  { month: "Mar", requests: 9800, errors: 98 },
  { month: "Apr", requests: 3908, errors: 39 },
  { month: "May", requests: 4800, errors: 48 },
  { month: "Jun", requests: 3800, errors: 38 },
]

const roleDistribution = [
  { name: "Admin", value: 3 },
  { name: "Editor", value: 4 },
  { name: "Viewer", value: 5 },
]

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]

export default function ReportsPage() {
  const t = useTranslations("reports")
  const [dateRange, setDateRange] = useState("6m")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">{t("lastMonth")}</SelectItem>
              <SelectItem value="3m">{t("last3Months")}</SelectItem>
              <SelectItem value="6m">{t("last6Months")}</SelectItem>
              <SelectItem value="1y">{t("lastYear")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t("export")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,483</div>
            <p className="text-xs text-muted-foreground">+12% {t("fromLastPeriod")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("activeUsers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,921</div>
            <p className="text-xs text-muted-foreground">71.4% {t("fromLastPeriod")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("apiRequests")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142K</div>
            <p className="text-xs text-muted-foreground">+18% {t("fromLastPeriod")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("avgResponseTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42ms</div>
            <p className="text-xs text-muted-foreground">-5% {t("fromLastPeriod")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("userGrowth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="active" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("apiRequestsErrors")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={requestData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("roleDistribution")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={(entry: any) => `${entry.name ?? ""} ${(Number(entry.percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {roleDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
