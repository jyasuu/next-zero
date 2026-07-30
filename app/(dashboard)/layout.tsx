import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { mockUsers } from "@/lib/constants"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const mockUser = mockUsers.find((u) => u.email === session.user?.email)
  const userRole = mockUser?.role

  return (
    <TooltipProvider delayDuration={0}>
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
    </TooltipProvider>
  )
}
