import createMDX from '@next/mdx'

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

const withMDX = createMDX({ options: { remarkPlugins: [], rehypePlugins: [] } })

export default withMDX(nextConfig)
