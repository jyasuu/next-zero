import { z } from "zod"

export const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

export const expenseFormSchema = z
  .object({
    title: z.string().trim().min(1, "title is required"),
    amount: z.string().trim().regex(AMOUNT_PATTERN, "amount is invalid"),
    justification: z.string().trim().min(1, "justification is required"),
  })
  .strict()

export type ExpenseFormInput = z.infer<typeof expenseFormSchema>
