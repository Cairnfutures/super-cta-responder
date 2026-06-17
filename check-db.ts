import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#') && l.trim() !== '')
    .map(l => {
      const idx = l.indexOf('=')
      const key = l.slice(0, idx).trim()
      const val = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      return [key, val] as [string, string]
    })
)

const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const sb = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], key)

async function main() {
  // Check testimonials table
  const { data: t, error: te } = await sb.from('testimonials').select('*').limit(5)
  console.log('\n=== TESTIMONIALS ===')
  console.log('error:', te)
  console.log('count:', t?.length ?? 0)
  if (t && t[0]) {
    console.log('columns:', Object.keys(t[0]))
    const sectors = [...new Set(t.map((r: any) => r.sector))]
    console.log('sectors (sample):', sectors)
  }

  // Get all distinct sector values from testimonials
  const { data: allT } = await sb.from('testimonials').select('sector')
  if (allT) {
    const allSectors = [...new Set(allT.map((r: any) => r.sector))].sort()
    console.log('ALL sector values:', allSectors)
  }

  // Check examples table
  const { data: e, error: ee } = await sb.from('examples').select('*').limit(5)
  console.log('\n=== EXAMPLES ===')
  console.log('error:', ee)
  console.log('count:', e?.length ?? 0)
  if (e && e[0]) {
    console.log('columns:', Object.keys(e[0]))
    console.log('first row industry:', e[0].industry)
    console.log('first row project_type:', e[0].project_type)
  }

  // Get distinct industry values
  const { data: allE } = await sb.from('examples').select('industry, project_type')
  if (allE) {
    const industries = [...new Set(allE.map((r: any) => r.industry).filter(Boolean))].sort()
    const projectTypes = [...new Set(allE.map((r: any) => r.project_type).filter(Boolean))].sort()
    console.log('ALL industry values:', industries)
    console.log('ALL project_type values:', projectTypes)
  }
}

main()
