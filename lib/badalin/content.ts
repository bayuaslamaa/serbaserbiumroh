/**
 * Copy and video list for /badalin.
 *
 * PLACEHOLDERS — replace before this page is promoted:
 *   - every `youtubeId` still reading `VIDEO_ID_n` (take the part after
 *     `watch?v=` in the real YouTube URL)
 *   - `badalinPrice`, if the real starting price differs
 * Cards whose id is still a placeholder render a striped poster instead of a
 * YouTube thumbnail, so unfilled entries are obvious on the page.
 */

export const PLACEHOLDER_PREFIX = "VIDEO_ID_"

export function isPlaceholderVideo(youtubeId: string): boolean {
  return youtubeId.startsWith(PLACEHOLDER_PREFIX)
}

export const badalinPrice = "Rp 3,5 juta"

export const badalinHero = {
  eyebrow: "LAYANAN BARU",
  title: "Badalin",
  tagline: "Badal umroh yang amanah & terdokumentasi.",
  description:
    "Setiap badal umroh dijalankan muthowwif tersertifikasi dan didokumentasikan penuh — dari niat di miqat hingga tahallul — lalu dikirim ke keluarga beserta sertifikat pelaksanaan.",
  priceNote: "termasuk video dokumentasi & sertifikat",
}

export interface BadalStep {
  n: string
  title: string
  description: string
}

export const badalSteps: BadalStep[] = [
  {
    n: "1",
    title: "Konsultasi via WhatsApp",
    description:
      "Sampaikan nama & untuk siapa badal dilakukan. Kami konfirmasi jadwal keberangkatan terdekat.",
  },
  {
    n: "2",
    title: "Pelaksanaan oleh muthowwif tersertifikasi",
    description:
      "Niat di miqat atas nama yang dibadalkan, lalu tawaf, sa'i, hingga tahallul.",
  },
  {
    n: "3",
    title: "Dokumentasi & sertifikat dikirim",
    description:
      "Video pelaksanaan + sertifikat badal dikirim ke keluarga sebagai bukti amanah.",
  },
]

export interface BadalVideo {
  title: string
  duration: string
  meta: string
  youtubeId: string
}

export const badalVideos: BadalVideo[] = [
  {
    title: "Dokumentasi Badal Umroh — Alm. Bapak H. Soleh (Full)",
    duration: "12:40",
    meta: "Dokumentasi lengkap",
    youtubeId: "VIDEO_ID_1",
  },
  {
    title: "Proses Miqat & Niat Badal di Masjid Aisyah",
    duration: "8:15",
    meta: "Miqat & niat",
    youtubeId: "VIDEO_ID_2",
  },
  {
    title: "Tawaf Badal Umroh — Live dari Masjidil Haram",
    duration: "15:02",
    meta: "Tawaf",
    youtubeId: "VIDEO_ID_3",
  },
  {
    title: "Sa'i & Tahallul — Dokumentasi Badal Ibu Siti",
    duration: "10:30",
    meta: "Sa'i & tahallul",
    youtubeId: "VIDEO_ID_4",
  },
  {
    title: "Serah Terima Sertifikat Badal Umroh",
    duration: "4:45",
    meta: "Sertifikat",
    youtubeId: "VIDEO_ID_5",
  },
  {
    title: "Q&A: Bagaimana Badalin Memastikan Amanah?",
    duration: "9:20",
    meta: "Tanya jawab",
    youtubeId: "VIDEO_ID_6",
  },
  {
    title: "Vlog: Sehari Bersama Tim Badalin di Makkah",
    duration: "18:05",
    meta: "Vlog tim",
    youtubeId: "VIDEO_ID_7",
  },
  {
    title: "Doa Khusus untuk Almarhum — Momen di Multazam",
    duration: "6:50",
    meta: "Doa",
    youtubeId: "VIDEO_ID_8",
  },
  {
    title: "Testimoni Keluarga Jamaah Badal Umroh",
    duration: "7:33",
    meta: "Testimoni",
    youtubeId: "VIDEO_ID_9",
  },
]

export const VIDEO_META_SUFFIX = "Tim Badalin"
