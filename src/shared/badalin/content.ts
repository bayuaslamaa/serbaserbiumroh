/**
 * Copy and video list for /badalin.
 *
 * Every entry here must be a published video. The placeholder guard below
 * stays as a safety net: an id of the form `VIDEO_ID_n` renders an inert
 * "segera tayang" poster instead of a dead embed, it is left out of the
 * video count, and it downgrades the page's "tonton sendiri" claim.
 */

export const PLACEHOLDER_PREFIX = "VIDEO_ID_"

export function isPlaceholderVideo(youtubeId: string): boolean {
  return youtubeId.startsWith(PLACEHOLDER_PREFIX)
}

/**
 * The Badalin starting price, in millions of rupiah. This is the single source
 * for both renderings — the /badalin hero prose and the service-catalog card —
 * so the two can never drift apart.
 */
const BADALIN_PRICE_JUTA = 1.8
const badalinPriceFigure = BADALIN_PRICE_JUTA.toLocaleString("id-ID")

/** Long form for prose: "Rp 1,8 juta". */
export const badalinPrice = `Rp ${badalinPriceFigure} juta`

/** Short form for the catalog card: "Rp 1,8 jt". */
export const badalinPriceShort = `Rp ${badalinPriceFigure} jt`

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

/**
 * Real published recordings. Titles and durations are taken verbatim from the
 * YouTube channel — do not paraphrase them, and never add an entry whose video
 * is not published yet.
 */
export const badalVideos: BadalVideo[] = [
  {
    title: "Badal Umroh Syawal Pak Tata Kurnia bin Saderin",
    duration: "26:39",
    meta: "Badal Syawal",
    youtubeId: "AHfWg5JoFsQ",
  },
  {
    title: "Badal Umroh Musim Haji Bu Atay binti Sulaeman",
    duration: "11:47",
    meta: "Badal Musim Haji",
    youtubeId: "OEToPrd_Vns",
  },
  {
    title:
      "Badal Umroh Syawal Pak Kasmiran Wongsorejo bin Martotinoyo Rahimahullah",
    duration: "17:31",
    meta: "Badal Syawal",
    youtubeId: "Xw2op5dW4VU",
  },
  {
    title: "Badal Umroh Syawal Bu Entin Kartini binti Didi",
    duration: "24:43",
    meta: "Badal Syawal",
    youtubeId: "PnVmMfrvH5o",
  },
  {
    title: "Badal Umroh Syawal Pak Qomar bin Didi",
    duration: "27:28",
    meta: "Badal Syawal",
    youtubeId: "Cng3uxddxXQ",
  },
]

export const VIDEO_META_SUFFIX = "Serba Serbi Umroh"
