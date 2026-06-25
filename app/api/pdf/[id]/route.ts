// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('responses')
      .select('title, one_pager_md, company')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const html = buildPdfHtml(data.one_pager_md || '', data.title || `ThingLink for ${data.company}`)

    // Dynamically import so Next.js tree-shakes this from client bundles
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 800 },
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
    })

    await browser.close()

    const filename = (data.title || 'ThingLink One-Pager')
      .replace(/[^a-z0-9 ]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('[pdf]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildPdfHtml(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    background: #ffffff;
    color: #111118;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page-wrapper {
    padding: 24px 28px;
  }
  .tl-screen-embed { display: none !important; }
  .tl-print-thumb { display: block !important; }
  .tl-no-print { display: none !important; }
  img { max-width: 100%; }
  a { color: inherit; }
</style>
</head>
<body>
<div style="padding:0 60px;">
${body}
</div>
</body>
</html>`
}
