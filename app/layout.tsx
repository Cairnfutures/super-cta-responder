import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ThingLink — Your Personalised Overview',
  description: 'Discover how ThingLink can transform learning in your organisation.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#f5f5f7' }}>{children}</body>
    </html>
  )
}
