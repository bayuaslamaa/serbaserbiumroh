"use client"

import { useMemo, useState, useTransition } from "react"

type CommunityJoinFormProps = {
  groupRequestUrl?: string
  adminChatUrl?: string
}

type SubmittedData = {
  fullName: string
  phone: string
}

function withPrefilledText(url: string, message: string) {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set("text", message)
    return parsed.toString()
  } catch {
    return url
  }
}

export function CommunityJoinForm({ groupRequestUrl, adminChatUrl }: CommunityJoinFormProps) {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [socialUsername, setSocialUsername] = useState("")
  const [intent, setIntent] = useState("")
  const [submitted, setSubmitted] = useState<SubmittedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const adminLink = useMemo(() => {
    if (!adminChatUrl || !submitted) return adminChatUrl
    const url = adminChatUrl.startsWith("http") ? adminChatUrl : `https://wa.me/${adminChatUrl}`
    return withPrefilledText(
      url,
      `Assalamualaikum, saya ${submitted.fullName} (${submitted.phone}) sudah mengisi form komunitas Umroh Mandiri dan ingin mengajukan masuk grup.`
    )
  }, [adminChatUrl, submitted])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const payload = {
      fullName,
      phone,
      socialUsername,
      intent,
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/community/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? "Data belum bisa disimpan. Coba lagi.")
          return
        }

        setSubmitted({ fullName: fullName.trim(), phone: phone.trim() })
      } catch {
        setError("Terjadi kesalahan jaringan. Coba lagi sebentar lagi.")
      }
    })
  }

  const inputClass = "w-full rounded-md border px-3 py-3 text-sm outline-none focus:ring-2"
  const inputStyle = {
    borderColor: "var(--color-border)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--color-text)",
  }
  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide"
  const labelStyle = { color: "var(--color-text-muted)" }

  if (submitted) {
    return (
      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Data sudah tercatat
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Silakan lanjut mengajukan lewat WhatsApp. Gunakan nama dan nomor HP yang sama:
          <span className="block pt-2 font-semibold" style={{ color: "var(--color-text)" }}>
            {submitted.fullName} - {submitted.phone}
          </span>
          Ini membantu admin mencocokkan pengajuan Kakak dengan data form. Persetujuan tetap mengikuti pengecekan admin.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {groupRequestUrl && (
            <a
              href={groupRequestUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md px-4 py-3 text-sm font-semibold"
              style={{ background: "var(--color-gold)", color: "#1a1206" }}
            >
              Ajukan Masuk Grup
            </a>
          )}
          {adminLink && (
            <a
              href={adminLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md border px-4 py-3 text-sm font-semibold"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              Hubungi Admin
            </a>
          )}
        </div>

        {!groupRequestUrl && !adminChatUrl && (
          <p className="mt-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Link WhatsApp belum tersedia. Admin akan mencocokkan data ini saat link pengajuan dibuka.
          </p>
        )}
      </section>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-6"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="space-y-5">
        {error && (
          <div
            className="rounded-md border px-4 py-3 text-sm"
            style={{ borderColor: "rgba(239,68,68,0.35)", color: "#ef4444", background: "rgba(239,68,68,0.08)" }}
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="community-full-name" className={labelClass} style={labelStyle}>
            Nama lengkap
          </label>
          <input
            id="community-full-name"
            className={inputClass}
            style={inputStyle}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            disabled={isPending}
            placeholder="Nama sesuai yang akan dipakai di WhatsApp"
          />
        </div>

        <div>
          <label htmlFor="community-phone" className={labelClass} style={labelStyle}>
            Nomor HP
          </label>
          <input
            id="community-phone"
            className={inputClass}
            style={inputStyle}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            disabled={isPending}
            inputMode="tel"
            placeholder="Contoh: 085172117757"
          />
        </div>

        <div>
          <label htmlFor="community-social-username" className={labelClass} style={labelStyle}>
            Username sosial media
          </label>
          <input
            id="community-social-username"
            className={inputClass}
            style={inputStyle}
            value={socialUsername}
            onChange={(event) => setSocialUsername(event.target.value)}
            disabled={isPending}
            placeholder="Opsional, contoh: @username"
          />
        </div>

        <div>
          <label htmlFor="community-intent" className={labelClass} style={labelStyle}>
            Alasan bergabung
          </label>
          <textarea
            id="community-intent"
            className={inputClass}
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" as const }}
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            disabled={isPending}
            placeholder="Opsional, contoh: ingin belajar umroh mandiri atau cari teman diskusi"
          />
        </div>
      </div>

      <p className="mt-5 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        Setelah dikirim, Kakak akan mendapatkan tombol pengajuan masuk grup dan hubungi admin. Pastikan nama dan nomor HP sama saat mengajukan lewat WhatsApp.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 w-full rounded-md px-5 py-3 text-sm font-semibold disabled:opacity-60"
        style={{ background: "var(--color-gold)", color: "#1a1206" }}
      >
        {isPending ? "Menyimpan..." : "Simpan dan Lanjutkan"}
      </button>
    </form>
  )
}
