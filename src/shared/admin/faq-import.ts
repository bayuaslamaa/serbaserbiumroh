import { parse } from "csv-parse/sync"

const REQUIRED_HEADERS = ["group", "question", "answer"] as const

export const FAQ_IMPORT_HEADERS = ["group", "question", "answer"] as const
export const FAQ_IMPORT_MAX_BYTES = 256 * 1024
export const FAQ_IMPORT_MAX_ROWS = 500

export const FAQ_IMPORT_TEMPLATE = [
  FAQ_IMPORT_HEADERS.join(","),
  [
    "Umum",
    "Apa yang dibantu oleh Umroh Planner?",
    "Umroh Planner membantu membuat estimasi biaya awal berdasarkan hotel, jumlah malam, jumlah jamaah, maskapai, dan layanan tambahan.",
  ].map(escapeCsvField).join(","),
  [
    "Estimasi Biaya",
    "Apakah estimasi biaya dijamin sama dengan harga final?",
    "Tidak. Estimasi mengikuti data harga di sistem. Harga final tetap perlu dicek ulang mengikuti musim, ketersediaan, kurs, dan aturan vendor.",
  ].map(escapeCsvField).join(","),
  [
    "Umum",
    "Apakah FAQ ini berlaku untuk public visitor dan user yang sudah login?",
    "Ya. FAQ yang sudah dipublish akan tampil untuk public visitor dan user yang sudah login. Item draft tidak tampil sampai admin mempublishnya.",
  ].map(escapeCsvField).join(","),
  [
    "Estimasi Biaya",
    "Kenapa estimasi bisa berbeda dengan harga OTA atau vendor?",
    "Estimasi memakai data internal dan asumsi kurs. Harga OTA atau vendor dapat berubah karena musim, stok kamar, tanggal booking, tipe kamar, kebijakan hotel, dan kurs terbaru.",
  ].map(escapeCsvField).join(","),
  [
    "Estimasi Biaya",
    "Apakah biaya transport, visa, dan siskopatuh sudah termasuk?",
    "Estimator dapat memasukkan layanan tambahan seperti visa, siskopatuh, transport, tasreh, dan tour jika layanan tersebut aktif di sistem. Admin tetap perlu mengecek detail biaya sebelum menawarkan harga final.",
  ].map(escapeCsvField).join(","),
  [
    "Hotel",
    "Apakah hotel yang dipilih pasti approved?",
    "Tidak ada jaminan 100 persen approved. Approval tetap mengikuti aturan hotel masing-masing, ketersediaan kamar, dan kebijakan saat pemesanan.",
  ].map(escapeCsvField).join(","),
  [
    "Hotel",
    "Apa arti hotel economy, standard, pelataran, dan premium?",
    "Kategori hotel adalah pengelompokan internal untuk membantu estimasi. Economy biasanya opsi hemat, standard opsi menengah, pelataran lebih dekat area masjid, dan premium untuk pilihan lebih tinggi.",
  ].map(escapeCsvField).join(","),
  [
    "Hotel",
    "Apakah nama hotel dari chat jamaah harus sama persis dengan data sistem?",
    "Tidak selalu. Jika nama hotel tidak ditemukan, admin dapat memilih hotel lain dengan level dan kota yang sebanding sebagai pembanding estimasi.",
  ].map(escapeCsvField).join(","),
  [
    "Penerbangan",
    "Apakah harga penerbangan dihitung per orang?",
    "Ya. Harga penerbangan di estimator dihitung per orang untuk tiket pulang pergi. Harga aktual tetap perlu dicek sesuai maskapai, tanggal, rute, dan ketersediaan kursi.",
  ].map(escapeCsvField).join(","),
  [
    "Penerbangan",
    "Apakah estimator memilih maskapai otomatis?",
    "Estimator memakai opsi maskapai atau tier yang tersedia di sistem. Admin dapat mengubah opsi harga penerbangan di data pricing jika ada update.",
  ].map(escapeCsvField).join(","),
  [
    "Visa dan Dokumen",
    "Apakah visa umroh sudah termasuk dalam estimasi?",
    "Visa dapat masuk estimasi jika service visa aktif. Nilai visa tetap perlu dicek karena biaya dan kurs dapat berubah.",
  ].map(escapeCsvField).join(","),
  [
    "Visa dan Dokumen",
    "Dokumen apa yang biasanya perlu disiapkan untuk umroh mandiri?",
    "Umumnya jamaah perlu menyiapkan paspor, foto, data identitas, bukti vaksin atau dokumen kesehatan jika diminta, tiket, hotel, visa, dan dokumen pendukung sesuai aturan terbaru.",
  ].map(escapeCsvField).join(","),
  [
    "Pembayaran",
    "Apakah hasil estimasi bisa langsung dianggap invoice?",
    "Tidak. Estimasi hanya gambaran awal biaya. Invoice atau penawaran final perlu dibuat setelah admin mengecek ketersediaan, harga terbaru, dan ketentuan vendor.",
  ].map(escapeCsvField).join(","),
  [
    "Pembayaran",
    "Kenapa total per orang bisa turun saat jumlah peserta bertambah?",
    "Beberapa biaya bersifat rombongan dan dapat dibagi ke lebih banyak peserta, misalnya transport tertentu. Karena itu total per orang bisa berubah saat jumlah peserta berubah.",
  ].map(escapeCsvField).join(","),
  [
    "Musim dan Jadwal",
    "Kenapa bulan keberangkatan mempengaruhi harga?",
    "Bulan tertentu seperti Ramadan, musim liburan, dan periode ramai bisa membuat harga hotel dan tiket naik. Data bulanan membantu estimator memberi kisaran yang lebih realistis.",
  ].map(escapeCsvField).join(","),
  [
    "Musim dan Jadwal",
    "Apakah Januari dan Februari bisa termasuk peak season?",
    "Bisa. Jika berdekatan dengan liburan, Ramadan, atau periode ramai lainnya, admin perlu memperbarui harga bulanan agar estimasi tidak terlalu rendah.",
  ].map(escapeCsvField).join(","),
  [
    "Admin",
    "Apa yang terjadi setelah FAQ CSV diimport?",
    "Row valid akan membuat FAQ draft baru atau memperbarui FAQ existing. Admin tetap perlu review, mengatur urutan, lalu publish item yang siap tampil.",
  ].map(escapeCsvField).join(","),
  [
    "Admin",
    "Apakah CSV bisa mengatur publish status dan urutan FAQ?",
    "Tidak. CSV hanya mengatur group, question, dan answer. Publish status dan urutan harus diatur manual di admin agar perubahan publik tetap terkontrol.",
  ].map(escapeCsvField).join(","),
].join("\n")

export type FaqImportStatus = "create" | "update" | "invalid" | "conflict"

export interface ExistingFaqImportGroup {
  id: string
  name: string
}

export interface ExistingFaqImportItem {
  id: string
  groupId: string
  question: string
}

export interface ParsedFaqImportData {
  groupName: string
  question: string
  answer: string
  groupKey: string
  questionKey: string
  willCreateGroup: boolean
}

export interface FaqImportRowResult {
  rowNumber: number
  status: FaqImportStatus
  errors: string[]
  data?: ParsedFaqImportData
  existingFaqId?: string
  existingGroupId?: string
}

export interface FaqImportParseResult {
  fileErrors: string[]
  rows: FaqImportRowResult[]
  summary: Record<FaqImportStatus, number>
  groupSummary: {
    create: number
  }
}

export interface ParseFaqCsvOptions {
  existingGroups?: ExistingFaqImportGroup[]
  existingFaqs?: ExistingFaqImportItem[]
}

export function normalizeFaqImportText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

export function parseFaqCsv(
  csvText: string,
  options: ParseFaqCsvOptions = {}
): FaqImportParseResult {
  const fileErrors: string[] = []
  const headers = new Set<string>()
  let records: Record<string, string>[] = []

  try {
    records = parse(csvText, {
      bom: true,
      columns: (rawHeaders: string[]) => {
        const normalizedHeaders = rawHeaders.map((header) => header.trim())
        for (const header of normalizedHeaders) headers.add(header)
        return normalizedHeaders
      },
      skip_empty_lines: true,
      trim: true,
    })
  } catch (error) {
    return emptyResult([error instanceof Error ? error.message : "CSV could not be parsed"])
  }

  for (const header of REQUIRED_HEADERS) {
    if (!headers.has(header)) fileErrors.push(`Missing required header: ${header}`)
  }

  const existingGroupsByKey = new Map(
    (options.existingGroups ?? []).map((group) => [normalizeFaqImportText(group.name), group])
  )
  const existingFaqsByQuestionKey = new Map(
    (options.existingFaqs ?? []).map((faq) => [normalizeFaqImportText(faq.question), faq])
  )

  const parsedRows = records.map((record, index) => parseRecord(record, index + 2, existingGroupsByKey))
  const questionCounts = new Map<string, number>()
  for (const row of parsedRows) {
    if (!row.data) continue
    questionCounts.set(row.data.questionKey, (questionCounts.get(row.data.questionKey) ?? 0) + 1)
  }

  const groupsToCreate = new Set<string>()
  const rows = parsedRows.map((row): FaqImportRowResult => {
    if (!row.data) return row

    if ((questionCounts.get(row.data.questionKey) ?? 0) > 1) {
      return {
        ...row,
        status: "conflict",
        errors: ["duplicate row in uploaded CSV for the same question"],
      }
    }

    if (row.data.willCreateGroup) groupsToCreate.add(row.data.groupKey)

    const existing = existingFaqsByQuestionKey.get(row.data.questionKey)
    if (existing) {
      return { ...row, status: "update", existingFaqId: existing.id }
    }

    return row
  })

  if (fileErrors.length > 0) {
    for (const row of rows) {
      if (row.status === "create" || row.status === "update") {
        row.status = "invalid"
        row.errors = [...row.errors, ...fileErrors]
      }
    }
  }

  return {
    fileErrors,
    rows,
    summary: summarize(rows),
    groupSummary: { create: groupsToCreate.size },
  }
}

function parseRecord(
  record: Record<string, string>,
  rowNumber: number,
  existingGroupsByKey: Map<string, ExistingFaqImportGroup>
): FaqImportRowResult {
  const errors: string[] = []
  const groupName = (record.group ?? "").trim()
  const question = (record.question ?? "").trim()
  const answer = (record.answer ?? "").trim()

  if (!groupName) errors.push("group is required")
  if (!question) errors.push("question is required")
  if (!answer) errors.push("answer is required")

  if (errors.length > 0) {
    return { rowNumber, status: "invalid", errors }
  }

  const groupKey = normalizeFaqImportText(groupName)
  const existingGroup = existingGroupsByKey.get(groupKey)

  return {
    rowNumber,
    status: "create",
    errors: [],
    existingGroupId: existingGroup?.id,
    data: {
      groupName,
      question,
      answer,
      groupKey,
      questionKey: normalizeFaqImportText(question),
      willCreateGroup: !existingGroup,
    },
  }
}

function summarize(rows: FaqImportRowResult[]): Record<FaqImportStatus, number> {
  return rows.reduce(
    (summary, row) => {
      summary[row.status] += 1
      return summary
    },
    { create: 0, update: 0, invalid: 0, conflict: 0 }
  )
}

function emptyResult(fileErrors: string[]): FaqImportParseResult {
  return {
    fileErrors,
    rows: [],
    summary: { create: 0, update: 0, invalid: 0, conflict: 0 },
    groupSummary: { create: 0 },
  }
}

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}
