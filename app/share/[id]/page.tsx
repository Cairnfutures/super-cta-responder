import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 24px 80px; background: #f5f5f7; font-family: Inter, -apple-system, sans-serif; }
  @media (max-width: 600px) { body { padding: 20px 16px 60px; } }
`

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('responses')
    .select('one_pager_md, title')
    .eq('id', id)
    .single()
  if (error || !data) notFound()

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${data.title || 'ThingLink Overview'}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/><style>${styles}</style></head><body><div style="max-width:720px;margin:0 auto">${data.one_pager_md}</div></body></html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}
