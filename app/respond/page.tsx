'use client'

import { useState, useMemo } from 'react'
import { marked } from '@/lib/marked'
import Header from '@/components/Header'

const C = {
  bg:        '#f5f5f7',
  surface:   '#ffffff',
  border:    '#e4e4e9',
  text:      '#111118',
  textSub:   '#6b6b80',
  textMuted: '#9999aa',
  sans:      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono:      'ui-monospace, SFMono-Regular, Menlo, monospace',
  grad:      'linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%)',
}

const INTEREST_OPTIONS = [
  'K-12 Education',
  'Higher Education',
  'Corporate Learning & Development',
  'Healthcare Training',
  'Sales Enablement',
  'Onboarding & HR',
  'Customer Education',
  'Tourism & Heritage',
  'Government & Public Sector',
  'Other',
]

const field: React.CSSProperties = {
  width: '100%', border: `1px solid ${C.border}`, borderRadius: 8,
  padding: '10px 14px', fontSize: 15, color: C.text, background: C.surface,
  outline: 'none', fontFamily: C.sans, boxSizing: 'border-box' as const, lineHeight: 1.5,
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', color: C.textMuted, display: 'block', marginBottom: 8,
}

const card: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: '18px 20px', marginBottom: 12,
}

type Tab = 'preview' | 'markdown' | 'html'

function CopyButton({ getText, text = '⎘ Copy' }: { getText: () => string; text?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(getText()); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ fontSize: 12, padding: '5px 14px', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSub, background: C.bg, cursor: 'pointer', fontFamily: C.sans, fontWeight: 500 }}>
      {copied ? '✓ Copied' : text}
    </button>
  )
}

export default function RespondPage() {
  const [form, setForm] = useState({
    name: '', company: '', role: '', interest: '',
    thinglinkContent: '', source: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id: string; title: string; onePagerMd: string } | null>(null)
  const [tab, setTab] = useState<Tab>('preview')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const htmlBody = useMemo(() => result ? (marked.parse(result.onePagerMd) as string) : '', [result])

  async function handleGenerate() {
    if (!form.name || !form.company || !form.role || !form.interest) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult({ id: data.id, title: data.title, onePagerMd: data.one_pager_md })
      setTab('preview')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preview',  label: 'Preview' },
    { id: 'markdown', label: 'Markdown' },
    { id: 'html',     label: 'HTML' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.sans }}>

      <Header
        nav={[
          { label: 'All responses', href: '/responses' },
          ...(result ? [{ label: 'Open ↗', href: `/result/${result.id}`, ghost: true }] : []),
        ]}
      />

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 20, padding: '24px 24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 74, display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Lead details */}
            <div style={card}>
              <span style={sectionLabel}>Lead details</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                <div>
                  <label style={{ fontSize: 13, color: C.textSub, display: 'block', marginBottom: 5 }}>Name / reference</label>
                  <input style={field} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Jane or Jane - Acme" />
                </div>

                <div>
                  <label style={{ fontSize: 13, color: C.textSub, display: 'block', marginBottom: 5 }}>Organisation</label>
                  <input style={field} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Corp" />
                </div>

                <div>
                  <label style={{ fontSize: 13, color: C.textSub, display: 'block', marginBottom: 5 }}>Role</label>
                  <input style={field} value={form.role} onChange={e => set('role', e.target.value)} placeholder="Head of L&D" />
                </div>

                <div>
                  <label style={{ fontSize: 13, color: C.textSub, display: 'block', marginBottom: 5 }}>Area of interest</label>
                  <select style={{ ...field, appearance: 'none' as any, cursor: 'pointer' }}
                    value={form.interest} onChange={e => set('interest', e.target.value)}>
                    <option value="">Select…</option>
                    {INTEREST_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

              </div>
            </div>

            {/* Optional context */}
            <div style={card}>
              <span style={sectionLabel}>Optional context</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: C.textSub, display: 'block', marginBottom: 5 }}>ThingLink content they viewed</label>
                  <input style={field} value={form.thinglinkContent} onChange={e => set('thinglinkContent', e.target.value)} placeholder="e.g. Hospital ward safety tour" />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: C.textSub, display: 'block', marginBottom: 5 }}>Source / campaign</label>
                  <input style={field} value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g. LinkedIn, email campaign" />
                </div>
              </div>
            </div>

            {/* Generate button */}
            {error && (
              <p style={{ fontSize: 13, color: '#c0392b', margin: '0 0 10px', padding: '10px 14px', background: '#fef5f5', borderRadius: 8, border: '1px solid #f9c2c2' }}>{error}</p>
            )}

            <button onClick={handleGenerate} disabled={loading}
              style={{
                padding: '13px 20px', fontSize: 14, fontWeight: 700, color: '#fff',
                background: loading ? C.textMuted : C.grad,
                border: 'none', borderRadius: 50, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: C.sans, letterSpacing: '-0.01em', transition: 'opacity 0.2s',
                width: '100%',
              }}>
              {loading ? 'Generating…' : 'Generate one-pager →'}
            </button>

          </div>
        </div>

        {/* ── Main panel ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {!result && !loading && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center', padding: 48 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 24 }}>✦</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>Your personalised one-pager will appear here</p>
              <p style={{ fontSize: 14, color: C.textSub, margin: 0 }}>Fill in the lead details on the left and click Generate.</p>
            </div>
          )}

          {loading && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center', padding: 48 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.grad, marginBottom: 18, animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <p style={{ fontSize: 15, color: C.textSub, margin: 0 }}>Generating personalised one-pager for {form.name}…</p>
            </div>
          )}

          {result && (
            <>
              {/* Title + tags */}
              <div style={{ marginBottom: 16 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{result.title}</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {[form.company, form.role, form.interest].filter(Boolean).map((tag, i) => (
                    <span key={i} style={{ fontSize: 12, color: C.textSub, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: '3px 10px' }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Tab panel */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 3 }}>
                    {tabs.map(t => (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                          padding: '6px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                          color: tab === t.id ? '#fff' : C.textSub,
                          background: tab === t.id ? C.grad : 'transparent',
                          border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: C.sans, transition: 'all 0.2s',
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {tab === 'html' && <CopyButton getText={() => htmlBody} text='⎘ Copy HTML' />}
                  {tab === 'markdown' && <CopyButton getText={() => result.onePagerMd} text='⎘ Copy markdown' />}
                </div>

                {tab === 'preview' && (
                  <div style={{ fontSize: 15, color: C.text, lineHeight: 1.85 }}
                    dangerouslySetInnerHTML={{ __html: htmlBody }} suppressHydrationWarning />
                )}

                {tab === 'markdown' && (
                  <textarea readOnly value={result.onePagerMd} rows={30}
                    onClick={e => (e.target as HTMLTextAreaElement).select()}
                    style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: C.mono, color: C.textSub, background: C.bg, resize: 'vertical' as const, cursor: 'text', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' as const }} />
                )}

                {tab === 'html' && (
                  <>
                    <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 12px' }}>Click to select all, then paste into HubSpot or your email tool. To save as PDF, use Preview tab + browser Print → Save as PDF.</p>
                    <textarea readOnly value={htmlBody} rows={30}
                      onClick={e => (e.target as HTMLTextAreaElement).select()}
                      style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: C.mono, color: C.textSub, background: C.bg, resize: 'vertical' as const, cursor: 'text', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' as const }} />
                  </>
                )}
              </div>

              {/* Internal share nudge */}
              <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>Link to Share Draft</p>
                  <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Share with a colleague or reseller — they can edit, save, and export the HTML.</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <CopyButton getText={() => `${typeof window !== 'undefined' ? window.location.origin : ''}/result/${result.id}`} text='⎘ Copy link' />
                  <a href={`/result/${result.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, padding: '5px 14px', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSub, background: C.bg, cursor: 'pointer', fontFamily: C.sans, fontWeight: 500, textDecoration: 'none' }}>
                    Open ↗
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
