import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BarChart3,
  Bell,
  ClipboardList,
  Key,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react"

export interface NavItem {
  href: string
  i18nKey: string
  icon: string
  requiredAction?: string
  badge?: string
}

export interface NavSection {
  id: string
  i18nKey: string
  items: NavItem[]
}

export const iconRegistry: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  ScrollText,
  Key,
  BarChart3,
  ClipboardList,
  Shield,
  Activity,
  Settings,
  User,
  Bell,
  MessageSquare,
}

export const navSections: NavSection[] = [
  {
    id: "overview",
    i18nKey: "nav.group.overview",
    items: [
      { href: "/dashboard", i18nKey: "nav.dashboard", icon: "LayoutDashboard" },
      { href: "/chat", i18nKey: "nav.chat", icon: "MessageSquare" },
    ],
  },
  {
    id: "management",
    i18nKey: "nav.group.management",
    items: [
      { href: "/users", i18nKey: "nav.users", icon: "Users", requiredAction: "users:Read" },
      { href: "/roles", i18nKey: "nav.roles", icon: "Shield", requiredAction: "roles:Read" },
      { href: "/requests", i18nKey: "nav.requests", icon: "ClipboardList", requiredAction: "requests:Read" },
      { href: "/api-keys", i18nKey: "nav.apiKeys", icon: "Key", requiredAction: "api-keys:Read" },
    ],
  },
  {
    id: "insights",
    i18nKey: "nav.group.insights",
    items: [
      { href: "/audit-log", i18nKey: "nav.auditLog", icon: "ScrollText", requiredAction: "audit:Read" },
      { href: "/reports", i18nKey: "nav.reports", icon: "BarChart3", requiredAction: "reports:Read" },
      { href: "/system-health", i18nKey: "nav.systemHealth", icon: "Activity", requiredAction: "system:Read" },
    ],
  },
  {
    id: "settings",
    i18nKey: "nav.group.settings",
    items: [
      { href: "/settings", i18nKey: "nav.settings", icon: "Settings", requiredAction: "settings:Read" },
      { href: "/notifications", i18nKey: "nav.notifications", icon: "Bell", requiredAction: "notifications:Read" },
      { href: "/profile", i18nKey: "nav.profile", icon: "User" },
    ],
  },
]

export function filterSections(sections: NavSection[], can: (action: string) => boolean): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.requiredAction || can(item.requiredAction)),
    }))
    .filter((section) => section.items.length > 0)
}

export function flattenNavItems(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items)
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/")
}

export function navRouteActions(sections: NavSection[]): Record<string, string> {
  return Object.fromEntries(
    flattenNavItems(sections)
      .filter((item) => item.requiredAction && item.href !== "/dashboard")
      .map((item) => [item.href, item.requiredAction as string])
  )
}
