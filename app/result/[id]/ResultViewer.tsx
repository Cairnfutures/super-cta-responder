'use client'

import { useState, useMemo } from 'react'
import { marked } from '@/lib/marked'

const C = {
  bg:       '#f5f5f7',
  surface:  '#ffffff',
  border:   '#e4e4e9',
  text:     '#111118',
  textSub:  '#6b6b80',
  textMuted:'#9999aa',
  sans:     '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono:     'ui-monospace, SFMono-Regular, Menlo, monospace',
  grad:     'linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%)',
}

const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 16,
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', color: C.textMuted, display: 'block', marginBottom: 10,
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

interface Props {
  title: string
  onePagerMd: string
  lead: { name: string; company: string; role: string; interest: string }
  createdAt: string
}

export default function ResultViewer({ title, onePagerMd, lead, createdAt }: Props) {
  const [tab, setTab] = useState<Tab>('preview')

  const htmlBody = useMemo(() => marked.parse(onePagerMd) as string, [onePagerMd])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preview',  label: 'Preview' },
    { id: 'markdown', label: 'Markdown' },
    { id: 'html',     label: 'HTML' },
  ]

  return (
    <div style={{ fontFamily: C.sans }}>

      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</h1>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
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
          {tab === 'html' && <CopyButton getText={() => htmlBody} text='⎘ Copy HTML' />}
          {tab === 'markdown' && <CopyButton getText={() => onePagerMd} text='⎘ Copy markdown' />}
        </div>

        {tab === 'preview' && (
          <div
            style={{ fontSize: 15, color: C.text, lineHeight: 1.85 }}
            dangerouslySetInnerHTML={{ __html: htmlBody }}
            suppressHydrationWarning
          />
        )}

        {tab === 'markdown' && (
          <textarea
            readOnly
            value={onePagerMd}
            rows={30}
            onClick={e => (e.target as HTMLTextAreaElement).select()}
            style={{
              width: '100%', border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '10px 14px', fontSize: 13, fontFamily: C.mono, color: C.textSub,
              background: C.bg, resize: 'vertical' as const, cursor: 'text',
              outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' as const,
            }}
          />
        )}

        {tab === 'html' && (
          <>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 12px' }}>Click to select all, then paste into your CMS or email tool.</p>
            <textarea
              readOnly
              value={htmlBody}
              rows={30}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
              style={{
                width: '100%', border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '10px 14px', fontSize: 12, fontFamily: C.mono, color: C.textSub,
                background: C.bg, resize: 'vertical' as const, cursor: 'text',
                outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' as const,
              }}
            />
          </>
        )}
      </div>

      {/* Share nudge */}
      <div style={{ ...card, textAlign: 'center', padding: '24px 28px' }}>
        <span style={sectionLabel}>Share this overview</span>
        <p style={{ fontSize: 14, color: C.textSub, margin: '0 0 14px', lineHeight: 1.6 }}>
          Send this page link directly to {lead.name} — it's always available at this URL.
        </p>
        <CopyButton getText={() => typeof window !== 'undefined' ? window.location.href : ''} text='⎘ Copy page link' />
      </div>

      <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 32 }}>
        Generated {createdAt} · ThingLink Super CTA Responder
      </p>
    </div>
  )
}
