import { z } from "zod"
import type { ChatTool } from "@/features/chat/types"
import { questionPromptSchema } from "@/features/chat/types"
import { formatAnswersSummary } from "@/features/chat/lib/question-flow"
import { registerPendingQuestion } from "@/features/chat/lib/pending-question"

export const questionToolInputSchema = z.object({
  questions: z.array(questionPromptSchema).min(1),
})

export const questionTool: ChatTool = {
  id: "question",
  name: "Ask the user",
  description: `Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take.

Usage notes:
- When \`custom\` is enabled (default), a "Type your own answer" option is added automatically; don't include "Other" or catch-all options
- Answers are returned as arrays of labels; set \`multiple: true\` to allow selecting more than one
- If you recommend a specific option, make that the first option in the list and add "(Recommended)" at the end of the label`,
  inputSchema: questionToolInputSchema,
  approval: "auto",
  execute: async (args, context) => {
    const toolCallId = context?.toolCallId
    if (!toolCallId) {
      return { ok: false, error: "The question tool requires a tool call context." }
    }
    const parsed = questionToolInputSchema.safeParse(args)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
      return { ok: false, error: issues.join("; ") }
    }
    const questions = parsed.data.questions
    const answers = await registerPendingQuestion(toolCallId)
    return {
      ok: true,
      data: {
        answers,
        summary: formatAnswersSummary(questions, answers),
      },
    }
  },
}
