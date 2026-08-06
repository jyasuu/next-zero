import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { ability } from "@/lib/acl"
import { getRoleWithPolicies } from "@/lib/roles"
import { navRouteActions, navSections, filterSections } from "@/lib/nav"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ChatProvider } from "@/features/chat/components/chat-provider"
import { ChatWidget } from "@/features/chat/components/chat-widget"

const routeActions = navRouteActions(navSections)

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

  const sections = filterSections(navSections, (action) => can(action))

  return (
    <TooltipProvider delayDuration={0}>
    <ChatProvider
      claims={{
        email: session.user.email ?? "",
        role: session.user.role ?? "",
        isAdmin,
      }}
    >
    <div className="flex h-screen overflow-hidden">
      <Sidebar sections={sections} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
    <ChatWidget />
    <MobileNav sections={sections} />
    </ChatProvider>
    </TooltipProvider>
  )
}
