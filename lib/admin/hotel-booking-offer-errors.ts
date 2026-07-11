export function isHotelBookingOfferUniqueViolation(error: unknown): boolean {
  let current = error

  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object") return false
    if ("code" in current && current.code === "23505") return true
    current = "cause" in current ? current.cause : null
  }

  return false
}
