export interface DashboardMetrics {
  totalUsers: number
  activeUsers: number
  revenue: string
  requests: number
  avgResponseTime: string
}

export interface Activity {
  id: string
  user: string
  action: string
  target: string
  timestamp: string
}

export interface ChartData {
  month: string
  users: number
  requests: number
}

export const mockMetrics: DashboardMetrics = {
  totalUsers: 12483,
  activeUsers: 8921,
  revenue: "$284,500",
  requests: 142230,
  avgResponseTime: "42ms",
}

export const mockActivities: Activity[] = [
  { id: "1", user: "Alice Johnson", action: "created", target: "New user account", timestamp: "2 minutes ago" },
  { id: "2", user: "Bob Smith", action: "updated", target: "System settings", timestamp: "15 minutes ago" },
  { id: "3", user: "Charlie Brown", action: "deleted", target: "API key prod-key-3", timestamp: "1 hour ago" },
  { id: "4", user: "Diana Prince", action: "exported", target: "Monthly report", timestamp: "2 hours ago" },
  { id: "5", user: "Edward Norton", action: "logged in", target: "from 192.168.1.100", timestamp: "3 hours ago" },
  { id: "6", user: "Fiona Apple", action: "generated", target: "New API key", timestamp: "5 hours ago" },
  { id: "7", user: "George Lucas", action: "updated", target: "User permissions", timestamp: "6 hours ago" },
]

export const mockChartData: ChartData[] = [
  { month: "Jan", users: 400, requests: 2400 },
  { month: "Feb", users: 300, requests: 1398 },
  { month: "Mar", users: 200, requests: 9800 },
  { month: "Apr", users: 278, requests: 3908 },
  { month: "May", users: 189, requests: 4800 },
  { month: "Jun", users: 239, requests: 3800 },
  { month: "Jul", users: 349, requests: 4300 },
]
