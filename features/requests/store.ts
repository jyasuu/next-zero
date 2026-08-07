"use client"

import { createListStore } from "@/stores/list-store"
import type { RequestRow } from "@/features/requests/lib/visibility"

export const useRequestsStore = createListStore<RequestRow>({ fetchUrl: "/api/requests" })
