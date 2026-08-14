import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

// Edge-safe config: no adapter, no pg, no bcrypt
// Used in middleware; full auth.ts adds the DrizzleAdapter for server-side use
export const authConfig: NextAuthConfig = {
  // Vercel set VERCEL=1 and Auth.js trusted the host implicitly. Behind
  // Coolify's Traefik there is no such marker, so every /api/auth/* call threw
  // UntrustedHost. Declared here rather than in auth.ts because middleware.ts
  // builds its own NextAuth() from this same config and hit the error too.
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({ credentials: {} }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as "USER" | "ADMIN"
      }
      return session
    },
  },
  pages: { signIn: "/login" },
}
