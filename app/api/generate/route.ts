import { NextRequest, NextResponse } from 'next/server'
import { generateResponse } from '@/lib/generate'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, company, role, interest, thinglinkContent, source } = body

    if (!name || !email || !company || !role || !interest) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate the one-pager via Claude
    const result = await generateResponse({ name, email, company, role, interest, thinglinkContent, source })

    // Save to Supabase
    const { data, error } = await supabaseAdmin
      .from('responses')
      .insert({
        name,
        email,
        company,
        role,
        interest,
        thinglink_content: thinglinkContent || null,
        source: source || null,
        title: result.title,
        one_pager_md: result.one_pager_md,
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id, title: result.title, one_pager_md: result.one_pager_md })
  } catch (err: any) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
