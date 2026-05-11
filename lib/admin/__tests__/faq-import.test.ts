import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
  FAQ_IMPORT_TEMPLATE,
  normalizeFaqImportText,
  parseFaqCsv,
} from "@/lib/admin/faq-import"

describe("FAQ CSV import", () => {
  it("exports a template with group, question, and answer columns", () => {
    expect(FAQ_IMPORT_TEMPLATE).toContain("group,question,answer")

    const result = parseFaqCsv(FAQ_IMPORT_TEMPLATE)

    expect(result.fileErrors).toEqual([])
    expect(result.summary.create).toBeGreaterThan(0)
  })

  it("keeps the docs template aligned with the canonical template", () => {
    const docsTemplate = readFileSync("docs/templates/faq-import-template.csv", "utf8").trim()

    expect(docsTemplate).toBe(FAQ_IMPORT_TEMPLATE)
  })

  it("normalizes text for matching", () => {
    expect(normalizeFaqImportText("  Apa   Itu Umroh Planner? ")).toBe("apa itu umroh planner?")
  })

  it("marks rows with missing groups as group creates", () => {
    const result = parseFaqCsv("group,question,answer\nUmum,Apa itu umroh mandiri?,Jawaban\n")

    expect(result.rows[0].status).toBe("create")
    expect(result.rows[0].data?.willCreateGroup).toBe(true)
    expect(result.groupSummary.create).toBe(1)
  })

  it("uses existing groups when names match", () => {
    const result = parseFaqCsv("group,question,answer\n umum ,Apa itu umroh mandiri?,Jawaban\n", {
      existingGroups: [{ id: "group-1", name: "Umum" }],
    })

    expect(result.rows[0].existingGroupId).toBe("group-1")
    expect(result.rows[0].data?.willCreateGroup).toBe(false)
    expect(result.groupSummary.create).toBe(0)
  })

  it("classifies matching questions as updates", () => {
    const result = parseFaqCsv("group,question,answer\nUmum,Apa itu umroh mandiri?,Jawaban baru\n", {
      existingFaqs: [{ id: "faq-1", groupId: "group-1", question: " Apa itu   umroh mandiri? " }],
    })

    expect(result.rows[0].status).toBe("update")
    expect(result.rows[0].existingFaqId).toBe("faq-1")
    expect(result.summary.update).toBe(1)
  })

  it("marks duplicate questions in the same CSV as conflicts", () => {
    const result = parseFaqCsv(
      "group,question,answer\n" +
        "Umum,Apa itu umroh mandiri?,Jawaban 1\n" +
        "Biaya, apa itu umroh mandiri? ,Jawaban 2\n"
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows.every((row) => row.status === "conflict")).toBe(true)
    expect(result.summary.conflict).toBe(2)
  })

  it("reports row-level validation errors", () => {
    const result = parseFaqCsv("group,question,answer\n,,\n")

    expect(result.rows[0].status).toBe("invalid")
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining(["group is required", "question is required", "answer is required"])
    )
  })

  it("reports missing required headers", () => {
    const result = parseFaqCsv("group,question\nUmum,Apa itu umroh mandiri?\n")

    expect(result.fileErrors).toContain("Missing required header: answer")
    expect(result.summary.invalid).toBe(1)
  })
})
