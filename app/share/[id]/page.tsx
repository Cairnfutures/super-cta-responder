import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('responses')
    .select('one_pager_md, title')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{data.title || 'ThingLink Overview'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{\`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 40px 24px 80px; background: #f5f5f7; font-family: 'Inter', -apple-system, sans-serif; }
          @media (max-width: 600px) { body { padding: 20px 16px 60px; } }
        \`}</style>
      </head>
      <body>
        <div style={{ maxWidth: 720, margin: '0 auto' }}
          dangerouslySetInnerHTML={{ __html: data.one_pager_md }} />
      </body>
    </html>
  )
}
