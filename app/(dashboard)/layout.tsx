import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { ability } from "@/lib/acl"
import { getRoleWithPolicies } from "@/lib/roles"
import { mainNavItems, settingsNavItems } from "@/lib/constants"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { TooltipProvider } from "@/components/ui/tooltip"

const routeActions: Record<string, string> = Object.fromEntries(
  [...mainNavItems, ...settingsNavItems]
    .filter((item) => item.requiredAction && item.href !== "/dashboard")
    .map((item) => [item.href, item.requiredAction as string])
)

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = session.user.isAdmin ?? false
  const role = await getRoleWithPolicies(session.user.role ?? "")
  const { can } = ability(role ?? { permissions: [] }, isAdmin)

  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? "/dashboard"
  const requiredAction = routeActions[pathname]
  if (requiredAction && !can(requiredAction)) {
    redirect("/403")
  }

  return (
    <TooltipProvider delayDuration={0}>
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
    </TooltipProvider>
  )
}
