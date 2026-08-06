"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useTranslations } from "next-intl"
import {
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
  ChevronLeft,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ability, type RolePolicies } from "@/lib/acl"
import { mainNavItems, settingsNavItems } from "@/lib/constants"
import { useUIStore } from "@/stores/ui-store"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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

interface SidebarProps {
  role: RolePolicies | null
  isAdmin: boolean
}

export function Sidebar({ role, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const isMobile = useMediaQuery("(max-width: 767px)")
  const { sidebarCollapsed, sidebarCollapsedChanged } = useUIStore()

  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      sidebarCollapsedChanged(true)
    }
  }, [isMobile])

  const { can } = ability(role ?? { permissions: [] }, isAdmin)

  const t = useTranslations()

  const visibleMain = mainNavItems.filter((item) => !item.requiredAction || can(item.requiredAction))
  const visibleSettings = settingsNavItems.filter((item) => !item.requiredAction || can(item.requiredAction))

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-background transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className={cn("flex items-center gap-2 font-semibold", sidebarCollapsed && "mx-auto")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
            EA
          </div>
          <span className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300",
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>{t("common.appName")}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <nav className="flex flex-col gap-1 px-2">
          {visibleMain.map((item) => {
            const Icon = iconMap[item.icon]
            if (!Icon) return null
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      aria-label={t(item.i18nKey)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t(item.i18nKey)}</TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={cn(
                  "overflow-hidden whitespace-nowrap transition-all duration-300",
                  sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}>{t(item.i18nKey)}</span>
              </Link>
            )
          })}
        </nav>

        <div className="my-2 px-2">
          <div className="border-t" />
        </div>

        <nav className="flex flex-col gap-1 px-2">
          {visibleSettings.map((item) => {
            const Icon = iconMap[item.icon]
            if (!Icon) return null
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      aria-label={t(item.i18nKey)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t(item.i18nKey)}</TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={cn(
                  "overflow-hidden whitespace-nowrap transition-all duration-300",
                  sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}>{t(item.i18nKey)}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => sidebarCollapsedChanged(!sidebarCollapsed)}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
          <span className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300 text-xs",
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>{t("sidebar.collapse")}</span>
        </Button>
      </div>
    </aside>
  )
}
