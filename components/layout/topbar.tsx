"use client"

import { Bell, Menu, Search } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LocaleSwitcher } from "@/components/layout/locale-switcher"
import { UserNav } from "@/components/layout/user-nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/stores/ui-store"

interface TopbarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function Topbar({ user }: TopbarProps) {
  const t = useTranslations()
  const setNavOpen = useUIStore((state) => state.setNavOpen)

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <div className="flex flex-1 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("topbar.menu")}
          onClick={() => setNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("topbar.search")}
            className="w-full pl-8"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild aria-label={t("nav.notifications")}>
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
          </Link>
        </Button>
        <UserNav user={user} />
      </div>
    </header>
  )
}
