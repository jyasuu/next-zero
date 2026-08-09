"use client"

import { createListStore } from "@/stores/list-store"
import type { SkillRow } from "@/features/skills/lib/skill"

export const useSkillsStore = createListStore<SkillRow>({ fetchUrl: "/api/skills" })
