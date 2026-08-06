import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { RequestsPanel } from "@/features/requests/components/requests-panel"
import { RequestsChatScope } from "@/features/requests/requests-chat-scope"
import { canApproveRequest } from "@/features/requests/lib/visibility"
import { actorFromSession } from "@/features/requests/server"

export default async function RequestsPage() {
  const t = await getTranslations("requests")
  const session = await auth()
  const actor = await actorFromSession(session)
  const canApprove = canApproveRequest(actor)
  const email = session?.user.email ?? ""

  return (
    <RequestsChatScope>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <RequestsPanel canApprove={canApprove} email={email} />
      </div>
    </RequestsChatScope>
  )
}
