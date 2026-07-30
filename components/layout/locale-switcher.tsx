"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const onSwitch = (next: string) => {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`
      router.refresh()
    })
  }

  return (
    <Select defaultValue={locale} onValueChange={onSwitch} disabled={isPending}>
      <SelectTrigger className="w-[90px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">中文</SelectItem>
      </SelectContent>
    </Select>
  )
}
