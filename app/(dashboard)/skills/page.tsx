import { getTranslations } from "next-intl/server"
import { SkillsPanel } from "@/features/skills/components/skills-panel"

export default async function SkillsPage() {
  const t = await getTranslations("skills")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <SkillsPanel />
    </div>
  )
}
