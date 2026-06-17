import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import Header from '@/components/Header'

export const dynamic = 'force-dynamic'

const C = {
  bg:        '#f5f5f7',
  surface:   '#ffffff',
  border:    '#e4e4e9',
  text:      '#111118',
  textSub:   '#6b6b80',
  textMuted: '#9999aa',
  sans:      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  grad:      'linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%)',
}

export default async function ResponsesPage() {
  const { data: responses } = await supabaseAdmin
    .from('responses')
    .select('id, name, company, role, interest, title, created_at')
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.sans }}>

      <Header nav={[{ label: '+ New one-pager', href: '/respond', primary: true }]} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
          Saved one-pagers <span style={{ fontSize: 14, fontWeight: 500, color: C.textMuted }}>({responses?.length ?? 0})</span>
        </h1>

        {(!responses || responses.length === 0) && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: C.textSub, margin: 0 }}>No one-pagers yet. <Link href="/respond" style={{ color: C.text, fontWeight: 600 }}>Generate your first one →</Link></p>
          </div>
        )}

        <style>{`.response-row:hover { border-color: #CC80E0 !important; }`}</style>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {responses?.map(r => {
            const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <Link key={r.id} href={`/result/${r.id}`} className="response-row"
                style={{ display: 'block', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', textDecoration: 'none', transition: 'border-color 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 6px', lineHeight: 1.3 }}>
                      {r.title || `ThingLink for ${r.company}`}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                      {r.name && <span style={{ fontSize: 12, color: C.textSub }}>{r.name}</span>}
                      {r.company && <span style={{ fontSize: 12, color: C.textMuted }}>· {r.company}</span>}
                      {r.role && <span style={{ fontSize: 12, color: C.textMuted }}>· {r.role}</span>}
                      {r.interest && <span style={{ fontSize: 12, color: C.textMuted }}>· {r.interest}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, marginTop: 2 }}>{date}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
