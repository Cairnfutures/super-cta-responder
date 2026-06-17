import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import ResultViewer from './ResultViewer'
import Header from '@/components/Header'

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

      <Header
        nav={[
          { label: '← All responses', href: '/responses' },
          { label: '+ New', href: '/respond', primary: true },
        ]}
      />

      {/* Body */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px 80px' }}>
        <ResultViewer
          id={id}
          title={data.title || `ThingLink for ${data.company}`}
          onePagerMd={data.one_pager_md || ''}
          lead={{ name: data.name, company: data.company, role: data.role, interest: data.interest }}
          createdAt={createdAt}
        />
      </div>
    </div>
  )
}
