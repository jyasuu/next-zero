"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Key,
  BarChart3,
  Shield,
  Activity,
  Settings,
  User,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ability } from "@/lib/acl"
import { mainNavItems, settingsNavItems, mockRoles } from "@/lib/constants"
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
  Shield,
  Activity,
  Settings,
  User,
  Bell,
}

interface SidebarProps {
  userRole?: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const isMobile = useMediaQuery("(max-width: 767px)")
  const { sidebarCollapsed, sidebarCollapsedChanged } = useUIStore()

  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      sidebarCollapsedChanged(true)
    }
  }, [isMobile])

  const role = mockRoles.find((r) => r.name === userRole)
  const { can } = ability(role ?? { permissions: [] })

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
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              EA
            </div>
            <span>Enterprise App</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              EA
            </div>
          </Link>
        )}
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
                      aria-label={item.title}
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
                  <TooltipContent side="right">{item.title}</TooltipContent>
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
                <Icon className="h-5 w-5" />
                {item.title}
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
                      aria-label={item.title}
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
                  <TooltipContent side="right">{item.title}</TooltipContent>
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
                <Icon className="h-5 w-5" />
                {item.title}
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
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
        </Button>
      </div>
    </aside>
  )
}
