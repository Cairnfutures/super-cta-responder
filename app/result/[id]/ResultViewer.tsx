'use client'

import { useState, useMemo } from 'react'
import { marked } from '@/lib/marked'

const C = {
  bg:        '#f5f5f7',
  surface:   '#ffffff',
  border:    '#e4e4e9',
  text:      '#111118',
  textSub:   '#6b6b80',
  textMuted: '#9999aa',
  sans:      "'Inter', sans-serif",
  mono:      'ui-monospace, SFMono-Regular, Menlo, monospace',
  grad:      'linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%)',
}

const field: React.CSSProperties = {
  width: '100%', border: `1px solid ${C.border}`, borderRadius: 8,
  padding: '10px 14px', fontSize: 15, color: C.text, background: C.surface,
  outline: 'none', fontFamily: C.sans, boxSizing: 'border-box' as const, lineHeight: 1.5,
}

const card: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: '20px 24px', marginBottom: 16,
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', color: C.textMuted, display: 'block', marginBottom: 10,
}

type Tab = 'preview' | 'markdown' | 'html'

function CopyButton({ getText, text = '⎘ Copy' }: { getText: () => string; text?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(getText()); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ fontSize: 12, padding: '5px 14px', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSub, background: C.bg, cursor: 'pointer', fontFamily: C.sans, fontWeight: 500 }}>
      {copied ? '✓ Copied' : text}
    </button>
  )
}

interface Props {
  id: string
  title: string
  onePagerMd: string
  lead: { name: string; company: string; role: string; interest: string }
  createdAt: string
}

export default function ResultViewer({ id, title: initialTitle, onePagerMd: initialMd, lead, createdAt }: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialMd)
  const [tab, setTab] = useState<Tab>('preview')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const htmlBody = useMemo(() => marked.parse(body) as string, [body])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preview',  label: 'Preview' },
    { id: 'markdown', label: 'Markdown' },
    { id: 'html',     label: 'HTML' },
  ]

  function handleDownloadPDF() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  body { margin: 0; padding: 24px; font-family: 'Inter', sans-serif; background: #fff; }
  @media print {
    body { padding: 0; }
    .tl-screen-embed { display: none !important; }
    .tl-print-thumb { display: block !important; }
  }
  .tl-screen-embed { display: none; }
  .tl-print-thumb { display: block; }
</style>
</head>
<body>
${htmlBody}
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); }</script>
</body>
</html>`)
    printWindow.document.close()
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/response/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, one_pager_md: body }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily: C.sans }}>

      {/* Editable title */}
      <div style={{ marginBottom: 20 }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          style={{ ...field, fontSize: 24, fontWeight: 800, border: 'none', borderBottom: `1px solid ${C.border}`, borderRadius: 0, padding: '0 0 12px', letterSpacing: '-0.02em' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' as const }}>
          {[lead.company, lead.role, lead.interest].filter(Boolean).map((tag, i) => (
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
          <div style={{ display: 'flex', gap: 8 }}>
            {tab === 'html' && <CopyButton getText={() => htmlBody} text='⎘ Copy HTML' />}
            {tab === 'markdown' && <CopyButton getText={() => body} text='⎘ Copy markdown' />}
            <button onClick={handleDownloadPDF}
              style={{ fontSize: 12, padding: '5px 14px', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSub, background: C.bg, cursor: 'pointer', fontFamily: C.sans, fontWeight: 500 }}>
              ↓ PDF
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ fontSize: 12, padding: '5px 14px', border: 'none', borderRadius: 6, color: '#fff', background: saved ? '#27ae60' : C.grad, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: C.sans, fontWeight: 600 }}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {tab === 'preview' && (
          <div style={{ fontSize: 15, color: C.text, lineHeight: 1.85 }}
            dangerouslySetInnerHTML={{ __html: htmlBody }} suppressHydrationWarning />
        )}

        {tab === 'markdown' && (
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={30}
            style={{ ...field, fontFamily: C.mono, fontSize: 13, lineHeight: 1.7, resize: 'vertical' as const }} />
        )}

        {tab === 'html' && (
          <>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 12px' }}>Click to select all, then paste into HubSpot or your email tool. To save as PDF, use the Preview tab + browser Print → Save as PDF.</p>
            <textarea readOnly value={htmlBody} rows={30}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
              style={{ ...field, fontFamily: C.mono, fontSize: 12, lineHeight: 1.6, color: C.textSub, background: C.bg, resize: 'vertical' as const, cursor: 'text' }} />
          </>
        )}
      </div>

      {/* Share */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <span style={sectionLabel}>Link to Share Draft</span>
          <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Share with a colleague or reseller — they can edit, save, and export the HTML.</p>
        </div>
        <CopyButton getText={() => typeof window !== 'undefined' ? window.location.href : ''} text='⎘ Copy link' />
      </div>

      <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 32 }}>
        Generated {createdAt} · ThingLink Super CTA Responder
      </p>
    </div>
  )
}
