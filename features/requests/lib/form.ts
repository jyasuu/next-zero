import { z } from "zod"

export const requestFormSchema = z
  .object({
    title: z.string().trim().min(1, "title is required"),
    access: z.string().trim().min(1, "access is required"),
    justification: z.string().trim().min(1, "justification is required"),
  })
  .strict()

export type RequestFormInput = z.infer<typeof requestFormSchema>
