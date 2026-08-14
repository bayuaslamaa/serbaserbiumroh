import createMDX from '@next/mdx'
import remarkFrontmatter from 'remark-frontmatter'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  experimental: {
    serverComponentsExternalPackages: ["pg", "@react-pdf/renderer"],
  },
  // Config redirects run ahead of middleware, so /hotel no longer bounces
  // anonymous visitors to /login on its way to the directory. permanent:true
  // emits a 308 so any existing link equity transfers to the canonical URL.
  async redirects() {
    return [
      {
        source: '/hotel',
        destination: '/hotel-nusuk',
        permanent: true,
      },
      // Every visitor has to land on www, and not only for the canonical signal
      // lib/seo/config.ts declares. Auth.js sets the PKCE cookie with no Domain
      // attribute, which makes it host-only: a sign-in begun on the apex stores
      // `__Secure-authjs.pkce.code_verifier` on serbaserbiumroh.id, while
      // AUTH_URL points Google's callback at www. The browser then refuses to
      // send that cookie to the other host, @auth/core throws
      // InvalidCheck("pkceCodeVerifier cookie was missing"), and -- because
      // InvalidCheck is not in its client-safe allowlist -- the user gets the
      // opaque /api/auth/error?error=Configuration instead. This redirect ran
      // at the Vercel domain layer until it silently disappeared; keeping it in
      // the repo means a dashboard change cannot break OAuth again.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'serbaserbiumroh.id' }],
        destination: 'https://www.serbaserbiumroh.id/:path*',
        permanent: true,
      },
    ]
  },
}

// remarkFrontmatter makes the MDX parser treat the leading `---` block as
// frontmatter rather than content. Without it the YAML renders as visible body
// text -- lib/panduan.ts reads that same frontmatter via gray-matter to build
// the guide index, so it has to stay in the file and be skipped at render.
const withMDX = createMDX({ options: { remarkPlugins: [remarkFrontmatter], rehypePlugins: [] } })

export default withMDX(nextConfig)
