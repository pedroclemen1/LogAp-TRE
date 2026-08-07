import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
}

export default createNextIntlPlugin()(nextConfig)
