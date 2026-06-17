import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import ResultViewer from './ResultViewer'

export const dynamic = 'force-dynamic'

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('responses')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const createdAt = new Date(data.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '3px solid transparent', borderImage: 'linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%) 1', background: '#ffffff', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>T</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111118', letterSpacing: '-0.01em' }}>ThingLink</span>
        </div>
        <span style={{ fontSize: 13, color: '#9999aa' }}>Prepared for {data.name} · {createdAt}</span>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px 80px' }}>
        <ResultViewer
          title={data.title || `ThingLink for ${data.company}`}
          onePagerMd={data.one_pager_md || ''}
          lead={{ name: data.name, company: data.company, role: data.role, interest: data.interest }}
          createdAt={createdAt}
        />
      </div>
    </div>
  )
}
