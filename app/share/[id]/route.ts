import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('responses')
    .select('one_pager_md, title')
    .eq('id', id)
    .single()

  if (error || !data) {
    return new NextResponse('Not found', { status: 404 })
  }

  const html = [
    '<!DOCTYPE html><html><head>',
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '<title>' + (data.title || 'ThingLink Overview') + '</title>',
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>',
    '<style>* { box-sizing: border-box; } body { margin: 0; padding: 40px 24px 80px; background: #f5f5f7; font-family: Inter, -apple-system, sans-serif; }</style>',
    '</head><body>',
    '<div style="max-width:720px;margin:0 auto">',
    data.one_pager_md,
    '</div></body></html>'
  ].join('')

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
