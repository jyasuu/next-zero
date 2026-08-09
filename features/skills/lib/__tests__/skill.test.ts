import { describe, it, expect } from "vitest"
import {
  skillSchema,
  skillOwnedBy,
  formatSkillsAdvertisement,
  formatSkillContentBlock,
} from "@/features/skills/lib/skill"

const validSkill = {
  name: "expense-review",
  description: "How to review an expense request",
  content: "# Expense review\n\n1. Fetch the receipt\n2. Check the amount\n3. Approve or reject",
}

describe("skillSchema", () => {
  it("accepts a valid skill", () => {
    const result = skillSchema.safeParse(validSkill)
    expect(result.success).toBe(true)
  })

  it("trims surrounding whitespace from every field", () => {
    const result = skillSchema.safeParse({
      name: "  expense-review  ",
      description: "  Review expenses  ",
      content: "  Fetch the receipt  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("expense-review")
      expect(result.data.description).toBe("Review expenses")
      expect(result.data.content).toBe("Fetch the receipt")
    }
  })

  it("rejects an empty name", () => {
    const result = skillSchema.safeParse({ ...validSkill, name: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "name")).toBe(true)
    }
  })

  it("rejects a name that is not slug-like", () => {
    for (const bad of ["expense review", "expense.review", "expense/review", "expense-review!", "ævar"]) {
      const result = skillSchema.safeParse({ ...validSkill, name: bad })
      expect(result.success, `expected "${bad}" to be rejected`).toBe(false)
    }
  })

  it("accepts letters, numbers, dashes, and underscores in a name", () => {
    for (const good of ["expense-review", "review_expense", "Expense2Review"]) {
      const result = skillSchema.safeParse({ ...validSkill, name: good })
      expect(result.success, `expected "${good}" to be accepted`).toBe(true)
    }
  })

  it("rejects a name longer than 50 characters", () => {
    const result = skillSchema.safeParse({ ...validSkill, name: "a".repeat(51) })
    expect(result.success).toBe(false)
  })

  it("rejects a missing description", () => {
    const result = skillSchema.safeParse({ ...validSkill, description: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "description")).toBe(true)
    }
  })

  it("rejects a description longer than 200 characters", () => {
    const result = skillSchema.safeParse({ ...validSkill, description: "d".repeat(201) })
    expect(result.success).toBe(false)
  })

  it("rejects empty content", () => {
    const result = skillSchema.safeParse({ ...validSkill, content: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "content")).toBe(true)
    }
  })

  it("rejects unknown fields", () => {
    const result = skillSchema.safeParse({ ...validSkill, extra: "nope" })
    expect(result.success).toBe(false)
  })
})

describe("skillOwnedBy", () => {
  it("is true when the row owner matches the caller", () => {
    expect(skillOwnedBy({ user_email: "ada@example.com" }, "ada@example.com")).toBe(true)
  })

  it("is false for a different caller", () => {
    expect(skillOwnedBy({ user_email: "ada@example.com" }, "bob@example.com")).toBe(false)
  })
})

describe("formatSkillsAdvertisement", () => {
  it("returns null when the caller has no skills", () => {
    expect(formatSkillsAdvertisement([])).toBeNull()
  })

  it("lists a single skill as a name/description line", () => {
    const advert = formatSkillsAdvertisement([
      { name: "expense-review", description: "How to review an expense request" },
    ])
    expect(advert).toBe("Available skills:\n- expense-review: How to review an expense request")
  })

  it("lists several skills one per line", () => {
    const advert = formatSkillsAdvertisement([
      { name: "expense-review", description: "Review an expense request" },
      { name: "export-report", description: "Export and reconcile a report" },
    ])
    expect(advert).toBe(
      "Available skills:\n- expense-review: Review an expense request\n- export-report: Export and reconcile a report"
    )
  })
})

describe("formatSkillContentBlock", () => {
  it("wraps the skill in a skill_content block with name, content, and a base-directory placeholder", () => {
    const block = formatSkillContentBlock({
      name: "expense-review",
      content: "# Expense review\n\n1. Fetch the receipt",
    })
    expect(block).toBe(
      [
        '<skill_content name="expense-review">',
        "# Skill: expense-review",
        "",
        "# Expense review",
        "",
        "1. Fetch the receipt",
        "",
        "Base directory for this skill: /skills/expense-review",
        "Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.",
        "</skill_content>",
      ].join("\n")
    )
  })

  it("trims the content body", () => {
    const block = formatSkillContentBlock({ name: "x", content: "  step one  " })
    expect(block).toContain("step one")
    expect(block).not.toContain("  step one  ")
  })

  it("carries no file list for database-stored skills", () => {
    const block = formatSkillContentBlock({ name: "expense-review", content: "step one" })
    expect(block).not.toContain("skill_files")
    expect(block).not.toContain("<file>")
  })
})
