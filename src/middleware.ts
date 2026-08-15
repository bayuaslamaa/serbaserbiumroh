import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export const PRIVATE_PREFIXES = [
  "/dashboard",
  "/estimate",
  "/pricelist-hotel",
  "/admin",
  "/api/estimate",
  "/api/admin",
] as const

export function isPrivatePath(pathname: string) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function isPublicPath(pathname: string) {
  return !isPrivatePath(pathname)
}

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const { pathname } = nextUrl
  const isLoggedIn = !!session?.user

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return isLoggedIn
      ? NextResponse.redirect(new URL("/dashboard", nextUrl))
      : NextResponse.next()
  }

  if (!isPrivatePath(pathname)) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/")
  if (isAdminPage && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard(/.*)?",
    "/estimate(/.*)?",
    "/pricelist-hotel(/.*)?",
    "/admin(/.*)?",
    "/api/estimate(/.*)?",
    "/api/admin(/.*)?",
    "/login",
  ],
}
