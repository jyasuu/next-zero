"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { iconRegistry, isActivePath, type NavSection } from "@/lib/nav"
import { useUIStore } from "@/stores/ui-store"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export function MobileNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname()
  const t = useTranslations()
  const { navOpen, setNavOpen } = useUIStore()

  return (
    <Dialog open={navOpen} onOpenChange={setNavOpen}>
      <DialogContent
        className="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[80vw] flex-col gap-0 border-r p-0 translate-x-0 translate-y-0"
      >
        <DialogTitle className="sr-only">{t("sidebar.menu")}</DialogTitle>
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
            EA
          </div>
          <span className="font-semibold">{t("common.appName")}</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-4">
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
                  {section.items.map((item) => {
                    const Icon = iconRegistry[item.icon]
                    const active = isActivePath(pathname, item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setNavOpen(false)}
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
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </DialogContent>
    </Dialog>
  )
}
