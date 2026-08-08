import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    turbopackPluginRuntimeStrategy: 'workerThreads',
    useTypeScriptCli: false,
  },
}

export default createNextIntlPlugin()(nextConfig)
