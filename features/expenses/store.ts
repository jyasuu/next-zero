"use client"

import { createListStore } from "@/stores/list-store"
import type { ExpenseRow } from "@/features/expenses/lib/visibility"

export const useExpensesStore = createListStore<ExpenseRow>({ fetchUrl: "/api/expenses" })
