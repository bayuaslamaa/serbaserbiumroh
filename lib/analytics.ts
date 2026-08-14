/**
 * Same shape as badalin-visa-web: `track(ANALYTICS_EVENTS.X.Y, { ...params })`.
 * The names live here rather than in their own file because this repo keeps
 * one module per concern under lib/ — the call sites read identically either way.
 */
type GtagWindow = Window & { gtag?: (...args: unknown[]) => void }

export const track = (event: string, params?: Record<string, unknown>) => {
  if (typeof window === "undefined") return
  ;(window as GtagWindow).gtag?.("event", event, params)
}

export const ANALYTICS_EVENTS = {
  COMMUNITY: {
    SUBMIT: "community_join_submit",
    SUCCESS: "community_join_success",
    FAILED: "community_join_failed",
    GROUP_CLICK: "community_group_click",
    ADMIN_CLICK: "community_admin_click",
  },
  CONTACT: {
    CONSULT_CLICK: "consult_wa_click",
    HOTEL_WA_CLICK: "hotel_wa_click",
  },
  WEBINAR: {
    RSVP_CLICK: "webinar_rsvp_click",
    SOCIAL_CLICK: "webinar_social_click",
  },
  AUTH: {
    LOGIN_SUBMIT: "login_submit",
    LOGIN_SUCCESS: "login_success",
    LOGIN_FAILED: "login_failed",
    GOOGLE_CLICK: "login_google_click",
  },
} as const
