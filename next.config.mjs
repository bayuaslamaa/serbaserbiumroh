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
    ]
  },
}

// remarkFrontmatter makes the MDX parser treat the leading `---` block as
// frontmatter rather than content. Without it the YAML renders as visible body
// text -- lib/panduan.ts reads that same frontmatter via gray-matter to build
// the guide index, so it has to stay in the file and be skipped at render.
const withMDX = createMDX({ options: { remarkPlugins: [remarkFrontmatter], rehypePlugins: [] } })

export default withMDX(nextConfig)
