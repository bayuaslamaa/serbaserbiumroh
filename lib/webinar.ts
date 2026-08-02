/**
 * The one place the webinar event's facts live.
 *
 * The date, the time, and the route used to be typed out separately in the
 * homepage banner, the webinar page body, that page's SEO description, and its
 * tests — and all four drifted apart. Every surface now reads from here, so an
 * event change is a single edit.
 *
 * These are fixed strings, not formatted output: the copy is specified by the
 * campaign, so a locale formatter would be a second source of truth rather than
 * a simplification. `WEBINAR_STARTS_AT` is the machine-readable twin of the two
 * labels — keep all three in step.
 *
 * Deliberately just exported constants. One event, no scheduling or admin
 * workflow to serve, so no data model and no CMS.
 */

export const WEBINAR_PATH = "/webinar-umroh-mandiri"

/** Visible schedule, exactly as the campaign specifies it. */
export const WEBINAR_DATE_LABEL = "Ahad, 2 Agustus 2026"
export const WEBINAR_TIME_LABEL = "13.00 WIB"

/**
 * Machine-readable twin of the two labels above. This is what a test can assert
 * on to notice the event has passed; the labels themselves are opaque strings.
 */
export const WEBINAR_STARTS_AT = new Date("2026-08-02T09:00:00+07:00")

/**
 * The campaign headline, split where the banner switches to gold. The full
 * string is derived so the two renderings can never disagree.
 */
export const WEBINAR_HEADLINE_LEAD = "Jangan Nekat Umroh Mandiri"
export const WEBINAR_HEADLINE_HIGHLIGHT = "Sebelum Tahu Risiko Ini!"
export const WEBINAR_HEADLINE = `${WEBINAR_HEADLINE_LEAD} ${WEBINAR_HEADLINE_HIGHLIGHT}`

/**
 * The RSVP link itself is login-gated and lives behind `WEBINAR_RSVP_URL`, a
 * server-side env var the webinar page owns. Anything that points a visitor at
 * registration links to `WEBINAR_PATH` and lets that page do the branching, so
 * this note travels with every such surface.
 */
export const WEBINAR_ACCESS_NOTE = "Khusus user yang sudah login"

