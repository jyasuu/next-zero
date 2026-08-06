"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { iconRegistry, isActivePath, type NavItem, type NavSection } from "@/lib/nav"
import { useUIStore } from "@/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface SidebarProps {
  sections: NavSection[]
}

export function Sidebar({ sections }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, sidebarCollapsedChanged } = useUIStore()
  const t = useTranslations()

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-background transition-all duration-300 motion-reduce:transition-none",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className={cn("flex items-center gap-2 font-semibold", sidebarCollapsed && "mx-auto")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
            EA
          </div>
          <span className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300 motion-reduce:transition-none",
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>{t("common.appName")}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-1 px-2">
            {sections.map((section) => (
              <CollapsedSection
                key={section.id}
                section={section}
                active={section.items.some((item) => isActivePath(pathname, item.href))}
              />
            ))}
          </div>
        ) : (
          <nav className="flex flex-col gap-4 px-2">
            {sections.map((section) => (
              <div key={section.id}>
                <p
                  className={cn(
                    "px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/60",
                    section.items.some((item) => isActivePath(pathname, item.href)) && "text-primary"
                  )}
                >
                  {t(section.i18nKey)}
                </p>
                <div className="mt-1 flex flex-col gap-1">
                  {section.items.map((item) => (
                    <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        )}
      </div>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          aria-label={t("sidebar.collapse")}
          onClick={() => sidebarCollapsedChanged(!sidebarCollapsed)}
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform duration-300 motion-reduce:transition-none",
            sidebarCollapsed && "rotate-180"
          )} />
          <span className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300 motion-reduce:transition-none text-xs",
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>{t("sidebar.collapse")}</span>
        </Button>
      </div>
    </aside>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const t = useTranslations()
  const Icon = iconRegistry[item.icon]

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" />}
      <span className="overflow-hidden whitespace-nowrap">{t(item.i18nKey)}</span>
      {item.badge && (
        <Badge variant="secondary" className="ml-auto text-xs">
          {t(item.badge)}
        </Badge>
      )}
    </Link>
  )
}

function CollapsedSection({ section, active }: { section: NavSection; active: boolean }) {
  const pathname = usePathname()
  const t = useTranslations()
  const firstItem = section.items[0]
  const Icon = firstItem ? iconRegistry[firstItem.icon] : undefined
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const openFlyout = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpen(true)
  }

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div onMouseEnter={openFlyout} onMouseLeave={scheduleClose}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Link
            href={firstItem?.href ?? "/dashboard"}
            aria-label={t(section.i18nKey)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {Icon && <Icon className="h-5 w-5" />}
          </Link>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          role="menu"
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleClose}
          className="w-56 p-0"
        >
          <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            {t(section.i18nKey)}
          </div>
          <nav className="flex flex-col gap-1 p-1">
            {section.items.map((item) => (
              <FlyoutLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
            ))}
          </nav>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function FlyoutLink({ item, active }: { item: NavItem; active: boolean }) {
  const t = useTranslations()
  const Icon = iconRegistry[item.icon]

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" />}
      <span className="overflow-hidden whitespace-nowrap">{t(item.i18nKey)}</span>
    </Link>
  )
}
