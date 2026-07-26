import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/community") ||
    pathname.startsWith("/api/visitor") ||
    pathname.startsWith("/panduan") ||
    pathname.startsWith("/cerita-jamaah") ||
    pathname.startsWith("/hotel-nusuk") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/komunitas") ||
    pathname.startsWith("/webinar-umroh-mandiri") ||
    pathname.startsWith("/visa") ||
    pathname.startsWith("/transportasi") ||
    pathname.startsWith("/layanan") ||
    pathname.startsWith("/badalin")
  )
}

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user

  const isAuthRoute = nextUrl.pathname.startsWith("/login")
  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isPublicRoute = isPublicPath(nextUrl.pathname)

  if (isPublicRoute) {
    if (isLoggedIn && isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  // Everything this pattern matches runs the auth middleware. Two kinds of
  // request must skip it entirely:
  //
  // 1. Crawler metadata routes. robots.txt and sitemap.xml are Next metadata
  //    routes, and middleware intercepting them stops the route handler from
  //    running at all -- so Google was served a login redirect instead.
  // 2. Public static files under public/. They carry no session, and the
  //    middleware was redirecting anonymous visitors away from the panduan
  //    PDF downloads.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|sitemap-.*\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|pdf|txt|xml|webmanifest)$).*)",
  ],
}
