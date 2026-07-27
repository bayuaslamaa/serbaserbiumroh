import type { RawSearchParams } from "./admin-requests-query"

export const ADMIN_REQUESTS_PATH = "/admin/community-requests"

const FILTER_KEYS = ["status", "q", "dup"] as const

/**
 * Builds a link to the admin list with some params replaced. A `null` override
 * drops the param.
 *
 * Changing any filter resets the page. Without that, narrowing the filter while
 * on page 40 lands on an empty result set that reads as a bug rather than as
 * "your filter matched fewer rows".
 */
export function buildAdminRequestsHref(
  current: RawSearchParams,
  overrides: Partial<Record<"status" | "q" | "dup" | "page", string | null>> = {}
): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(current)) {
    const first = Array.isArray(value) ? value[0] : value
    if (first) params.set(key, first)
  }

  const touchesFilter = FILTER_KEYS.some((key) => key in overrides)
  if (touchesFilter && !("page" in overrides)) {
    params.delete("page")
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === "") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  // Page 1 is the default; spelling it out only makes links noisier.
  if (params.get("page") === "1") params.delete("page")

  const query = params.toString()
  return query ? `${ADMIN_REQUESTS_PATH}?${query}` : ADMIN_REQUESTS_PATH
}
