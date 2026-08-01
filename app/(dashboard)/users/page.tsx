import { getTranslations } from "next-intl/server"
import { UsersTable } from "@/features/users/components/users-table"
import { UsersChatScope } from "@/features/users/components/users-chat-scope"

export default async function UsersPage() {
  const t = await getTranslations("users")

  return (
    <UsersChatScope>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <UsersTable />
      </div>
    </UsersChatScope>
  )
}
