"use client"

import { useMemo, useState, useTransition } from "react"
import {
  SSU_GROUPS,
  STATS_SNAPSHOT_LABEL,
  hasAnyGroupUrl,
  type SsuGroup,
} from "@/lib/community/groups"

type CommunityJoinFormProps = {
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

/** "310 member aktif 30 hari terakhir", or why there is no figure to show. */
function activityLabel(group: SsuGroup) {
  return group.activeMembers30d === undefined
    ? "Baru dibuka"
    : `${group.activeMembers30d} member aktif 30 hari terakhir`
}

/**
 * One row in the group list.
 *
 * Two independent axes: whether the group can be joined (an invite link exists)
 * decides link-vs-span, and whether it has history decides the figure. A group
 * with no link still shows its activity, so the list stays informative while
 * links are being filled in.
 */
function GroupRow({ group }: { group: SsuGroup }) {
  const activity = activityLabel(group)
  const joinable = group.url.length > 0
  const onGold = group.isNewest && joinable

  const rowClass = "flex flex-col gap-1 rounded-md border px-4 py-3 text-left"
  const rowStyle = onGold
    ? { background: "var(--color-gold)", borderColor: "var(--color-gold)", color: "#1a1206" }
    : {
        borderColor: "var(--color-border)",
        color: "var(--color-text)",
        opacity: joinable ? 1 : 0.6,
      }

  const body = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{group.label}</span>
        {group.isNewest && (
          <span
            className="rounded-full px-2 py-[2px] text-[11px] font-semibold"
            style={
              onGold
                ? { background: "rgba(26,18,6,0.14)", color: "#1a1206" }
                : { background: "rgba(201,168,76,0.12)", color: "var(--color-gold)" }
            }
          >
            Grup terbaru
          </span>
        )}
        {!joinable && (
          <span className="text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            Link belum tersedia
          </span>
        )}
        {joinable && (
          <span aria-hidden className="ml-auto text-sm">
            →
          </span>
        )}
      </span>
      <span
        className="text-xs"
        style={{ color: onGold ? "rgba(26,18,6,0.75)" : "var(--color-text-muted)" }}
      >
        {activity}
      </span>
    </>
  )

  if (!joinable) {
    return (
      <span className={rowClass} style={rowStyle}>
        {body}
      </span>
    )
  }

  return (
    <a
      href={group.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Ajukan masuk grup ${group.label}, ${activity}`}
      className={rowClass}
      style={rowStyle}
    >
      {body}
    </a>
  )
}

export function CommunityJoinForm({ adminChatUrl }: CommunityJoinFormProps) {
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

        <div className="mt-6">
          <p className={labelClass} style={labelStyle}>
            Pilih grup
          </p>
          <div className="flex flex-col gap-2">
            {SSU_GROUPS.map((group) => (
              <GroupRow key={group.id} group={group} />
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            Data aktivitas per {STATS_SNAPSHOT_LABEL}.
          </p>
        </div>

        {adminLink && (
          <div
            className="mt-6 border-t pt-5"
            style={{ borderColor: "var(--color-border)" }}
          >
            <a
              href={adminLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md border px-4 py-3 text-sm font-semibold"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              Hubungi Admin
            </a>
          </div>
        )}

        {!hasAnyGroupUrl(SSU_GROUPS) && !adminChatUrl && (
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
        Setelah dikirim, Kakak bisa memilih grup SSU yang ingin dimasuki dan menghubungi admin. Pastikan nama dan nomor HP sama saat mengajukan lewat WhatsApp.
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
