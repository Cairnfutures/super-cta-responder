/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
  },
}
module.exports = nextConfig
