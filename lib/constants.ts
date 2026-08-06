import type { Policy } from "@/lib/acl"

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  status: "active" | "inactive"
  createdAt: string
}

export interface AuditEntry {
  id: string
  user: string
  action: string
  resource: string
  details: string
  ip: string
  timestamp: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "error" | "success"
  read: boolean
  createdAt: string
}

export interface ApiKey {
  id: string
  name: string
  scope: string
  createdAt: string
  lastUsed: string | null
  active: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  policies?: Policy[]
  userCount: number
}

export interface SystemService {
  name: string
  status: "healthy" | "degraded" | "down"
  uptime: string
  responseTime: string
}

export interface Incident {
  id: string
  title: string
  status: "resolved" | "investigating" | "monitoring"
  severity: "critical" | "major" | "minor"
  createdAt: string
  resolvedAt?: string
}

export const mockUsers: User[] = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "active", createdAt: "2024-01-15" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", role: "Editor", status: "active", createdAt: "2024-02-20" },
  { id: "3", name: "Charlie Brown", email: "charlie@example.com", role: "Viewer", status: "active", createdAt: "2024-03-10" },
  { id: "4", name: "Diana Prince", email: "diana@example.com", role: "Admin", status: "active", createdAt: "2024-01-05" },
  { id: "5", name: "Edward Norton", email: "edward@example.com", role: "Editor", status: "inactive", createdAt: "2024-04-22" },
  { id: "6", name: "Fiona Apple", email: "fiona@example.com", role: "Viewer", status: "active", createdAt: "2024-05-30" },
  { id: "7", name: "George Lucas", email: "george@example.com", role: "Editor", status: "active", createdAt: "2024-06-15" },
  { id: "8", name: "Hannah Montana", email: "hannah@example.com", role: "Viewer", status: "inactive", createdAt: "2024-07-01" },
  { id: "9", name: "Ivan Petrov", email: "ivan@example.com", role: "Admin", status: "active", createdAt: "2024-08-12" },
  { id: "10", name: "Julia Roberts", email: "julia@example.com", role: "Editor", status: "active", createdAt: "2024-09-05" },
  { id: "11", name: "Kevin Hart", email: "kevin@example.com", role: "Viewer", status: "active", createdAt: "2024-10-18" },
  { id: "12", name: "Laura Croft", email: "laura@example.com", role: "Editor", status: "active", createdAt: "2024-11-25" },
]

export const mockAuditEntries: AuditEntry[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  user: mockUsers[i % mockUsers.length].name,
  action: ["create", "update", "delete", "login", "logout", "export"][i % 6],
  resource: ["User", "Role", "Settings", "API Key", "Report", "Notification"][i % 6],
  details: `Performed ${["create", "update", "delete", "login", "logout", "export"][i % 6]} on ${["User", "Role", "Settings", "API Key", "Report", "Notification"][i % 6]}`,
  ip: `192.168.${i % 255}.${(i * 7) % 255}`,
  timestamp: new Date(2024, 0, 1 + i).toISOString(),
}))

export const mockNotifications: Notification[] = [
  { id: "1", title: "New user registered", message: "Alice Johnson has created an account.", type: "info", read: false, createdAt: "2024-12-01T10:00:00Z" },
  { id: "2", title: "System update", message: "System will be down for maintenance at 2 AM.", type: "warning", read: false, createdAt: "2024-12-01T09:00:00Z" },
  { id: "3", title: "Deployment failed", message: "Production deployment failed on server-01.", type: "error", read: true, createdAt: "2024-11-30T15:00:00Z" },
  { id: "4", title: "Report ready", message: "Monthly analytics report is ready for download.", type: "success", read: false, createdAt: "2024-11-30T12:00:00Z" },
  { id: "5", title: "API key created", message: "A new API key was generated for integration.", type: "info", read: true, createdAt: "2024-11-29T08:00:00Z" },
  { id: "6", title: "Permission change", message: "Your role permissions have been updated.", type: "warning", read: false, createdAt: "2024-11-28T16:00:00Z" },
  { id: "7", title: "Backup complete", message: "Daily backup completed successfully.", type: "success", read: true, createdAt: "2024-11-28T03:00:00Z" },
  { id: "8", title: "SSL certificate expiring", message: "SSL certificate for app.example.com expires in 7 days.", type: "error", read: false, createdAt: "2024-11-27T14:00:00Z" },
]

export const mockApiKeys: ApiKey[] = [
  { id: "1", name: "Production API", scope: "read, write", createdAt: "2024-06-01", lastUsed: "2024-12-01", active: true },
  { id: "2", name: "Staging API", scope: "read", createdAt: "2024-07-15", lastUsed: "2024-11-28", active: true },
  { id: "3", name: "Mobile App Key", scope: "read, write", createdAt: "2024-08-20", lastUsed: "2024-11-30", active: true },
  { id: "4", name: "Deprecated Key", scope: "read", createdAt: "2024-01-10", lastUsed: "2024-03-15", active: false },
  { id: "5", name: "CI/CD Pipeline", scope: "read, write, delete", createdAt: "2024-09-05", lastUsed: "2024-12-01", active: true },
]

export const mockRoles: Role[] = [
  { id: "1", name: "Admin", description: "Full system access", permissions: ["read", "write", "delete", "manage_users", "manage_roles"], userCount: 3 },
  { id: "2", name: "Editor", description: "Can create and edit content", permissions: ["read", "write"], userCount: 4 },
  { id: "3", name: "Viewer", description: "Read-only access", permissions: ["read"], userCount: 5 },
  { id: "4", name: "Auditor", description: "Access to audit logs and reports", permissions: ["read", "export"], userCount: 0 },
]

export const mockSystemServices: SystemService[] = [
  { name: "Web Server", status: "healthy", uptime: "45d 12h 30m", responseTime: "45ms" },
  { name: "Database", status: "healthy", uptime: "45d 12h 30m", responseTime: "12ms" },
  { name: "Cache", status: "healthy", uptime: "30d 8h 15m", responseTime: "2ms" },
  { name: "Queue Worker", status: "degraded", uptime: "10d 4h 20m", responseTime: "150ms" },
  { name: "File Storage", status: "healthy", uptime: "45d 12h 30m", responseTime: "85ms" },
  { name: "Email Service", status: "healthy", uptime: "45d 12h 30m", responseTime: "230ms" },
]

export const mockIncidents: Incident[] = [
  { id: "1", title: "Database connection pool exhaustion", status: "resolved", severity: "critical", createdAt: "2024-11-15T10:30:00Z", resolvedAt: "2024-11-15T12:45:00Z" },
  { id: "2", title: "High latency on API endpoints", status: "resolved", severity: "major", createdAt: "2024-11-20T14:00:00Z", resolvedAt: "2024-11-20T16:30:00Z" },
  { id: "3", title: "SSL certificate renewal failure", status: "resolved", severity: "minor", createdAt: "2024-11-25T08:00:00Z", resolvedAt: "2024-11-25T09:15:00Z" },
  { id: "4", title: "Queue worker stuck on job processing", status: "investigating", severity: "major", createdAt: "2024-12-01T22:00:00Z" },
  { id: "5", title: "Memory usage spike on server-03", status: "monitoring", severity: "minor", createdAt: "2024-12-02T06:00:00Z" },
]

export const permissionDomains = [
  {
    domain: "dashboard",
    label: "Dashboard",
    actions: ["dashboard:Read"],
  },
  {
    domain: "users",
    label: "Users",
    actions: ["users:Read", "users:Write", "users:Create", "users:Delete", "users:Manage"],
  },
  {
    domain: "roles",
    label: "Roles",
    actions: ["roles:Read", "roles:Manage"],
  },
  {
    domain: "audit",
    label: "Audit Log",
    actions: ["audit:Read"],
  },
  {
    domain: "api-keys",
    label: "API Keys",
    actions: ["api-keys:Read", "api-keys:Manage"],
  },
  {
    domain: "reports",
    label: "Reports",
    actions: ["reports:Read", "reports:Export"],
  },
  {
    domain: "requests",
    label: "Requests",
    actions: ["requests:Read", "requests:Create", "requests:Approve"],
  },
  {
    domain: "expenses",
    label: "Expenses",
    actions: ["expenses:Read", "expenses:Create", "expenses:Approve"],
  },
  {
    domain: "settings",
    label: "Settings",
    actions: ["settings:Read"],
  },
  {
    domain: "notifications",
    label: "Notifications",
    actions: ["notifications:Read"],
  },
  {
    domain: "system",
    label: "System Health",
    actions: ["system:Read"],
  },
]

export const allPermissions = [
  "read",
  "write",
  "delete",
  "manage_users",
  "manage_roles",
  "export",
  "manage_api_keys",
  "view_audit_log",
]
