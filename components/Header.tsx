'use client'

const C = {
  grad:    'linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%)',
  surface: '#ffffff',
  text:    '#111118',
  textSub: '#6b6b80',
  border:  '#e4e4e9',
  sans:    "'Inter', sans-serif",
}

interface NavItem {
  label: string
  href: string
  /** Renders as a filled gradient pill */
  primary?: boolean
  /** Renders as a ghost/outline style */
  ghost?: boolean
}

interface HeaderProps {
  nav?: NavItem[]
  /** Extra content on the right side (e.g. a share button) */
  right?: React.ReactNode
}

export default function Header({ nav = [], right }: HeaderProps) {
  return (
    <header
      style={{
        borderBottom: '3px solid transparent',
        borderImage: `${C.grad} 1`,
        background: C.surface,
        padding: '0 28px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        fontFamily: C.sans,
      }}
    >
      {/* ── Brand ── */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>

        {/* Logomark: gradient rounded square with "T" mark */}
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tlg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#FFB347" />
              <stop offset="35%"  stopColor="#FF7B8B" />
              <stop offset="65%"  stopColor="#CC80E0" />
              <stop offset="100%" stopColor="#5CE8D4" />
            </linearGradient>
          </defs>
          <rect width="36" height="36" rx="9" fill="url(#tlg)" />
          {/* Horizontal bar of T */}
          <rect x="9" y="10.5" width="18" height="3.5" rx="1.75" fill="white" />
          {/* Vertical stem of T */}
          <rect x="15.25" y="10.5" width="5.5" height="16" rx="2" fill="white" />
          {/* Subtle inner glow dot */}
          <circle cx="18" cy="26" r="1.2" fill="white" opacity="0.5" />
        </svg>

        {/* Wordmark */}
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: '#1a1a2e',
          }}
        >
          ThingLink
        </span>
      </a>

      {/* ── Right side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        {nav.map((item, i) => (
          <a
            key={i}
            href={item.href}
            style={{
              fontSize: 13,
              fontWeight: item.primary ? 600 : 500,
              color: item.primary ? '#fff' : C.textSub,
              background: item.primary ? C.grad : 'transparent',
              border: item.ghost ? `1px solid ${C.border}` : 'none',
              borderRadius: 20,
              padding: item.primary ? '6px 18px' : item.ghost ? '5px 14px' : '5px 10px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </header>
  )
}
