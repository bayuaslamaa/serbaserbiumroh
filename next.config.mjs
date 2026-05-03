import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  experimental: {
    serverComponentsExternalPackages: ["pg", "@react-pdf/renderer"],
  },
}

const withMDX = createMDX({ options: { remarkPlugins: [], rehypePlugins: [] } })

export default withMDX(nextConfig)
