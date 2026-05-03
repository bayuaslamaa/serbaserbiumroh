/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg", "@react-pdf/renderer"],
  },
}

export default nextConfig
