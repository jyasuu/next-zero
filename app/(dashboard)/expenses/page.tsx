import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { ExpensesPanel } from "@/features/expenses/components/expenses-panel"
import { ExpensesChatScope } from "@/features/expenses/expenses-chat-scope"
import { canApproveExpense } from "@/features/expenses/lib/visibility"
import { actorFromSession } from "@/features/expenses/server"

export default async function ExpensesPage() {
  const t = await getTranslations("expenses")
  const session = await auth()
  const actor = await actorFromSession(session)
  const canApprove = canApproveExpense(actor)
  const email = session?.user.email ?? ""

  return (
    <ExpensesChatScope>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <ExpensesPanel canApprove={canApprove} email={email} />
      </div>
    </ExpensesChatScope>
  )
}
