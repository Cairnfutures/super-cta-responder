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
  primary?: boolean
  ghost?: boolean
}

interface HeaderProps {
  nav?: NavItem[]
  right?: React.ReactNode
}

export default function Header({ nav = [], right }: HeaderProps) {
  return (
    <header style={{ borderBottom: '3px solid transparent', borderImage: `${C.grad} 1`, background: C.surface, padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontFamily: C.sans }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <img src="/thinglink-logo.png" alt="ThingLink" style={{ height: 28, width: 'auto', display: 'block' }} />
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        {nav.map((item, i) => (
          <a key={i} href={item.href} style={{ fontSize: 13, fontWeight: item.primary ? 600 : 500, color: item.primary ? '#fff' : C.textSub, background: item.primary ? C.grad : 'transparent', border: item.ghost ? `1px solid ${C.border}` : 'none', borderRadius: 20, padding: item.primary ? '6px 18px' : item.ghost ? '5px 14px' : '5px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {item.label}
          </a>
        ))}
      </div>
    </header>
  )
}
