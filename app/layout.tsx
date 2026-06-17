import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ThingLink — Your Personalised Overview',
  description: 'Discover how ThingLink can transform learning in your organisation.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`body, * { font-family: 'Inter', sans-serif; }`}</style>
      </head>
      <body style={{ margin: 0, padding: 0, background: '#f5f5f7' }}>{children}</body>
    </html>
  )
}
