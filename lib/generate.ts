import { anthropic, GENERATION_MODEL } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface LeadInput {
  name: string
  company: string
  role: string
  interest: string
  thinglinkContent?: string
  source?: string
}

export interface GeneratedResponse {
  title: string
  one_pager_md: string
}

// ─────────────────────────────────────────
// Map lead interest → testimonial sectors
// ─────────────────────────────────────────
const INTEREST_TO_SECTORS: Record<string, string[]> = {
  'K-12 Education':                      ['k12'],
  'Higher Education':                     ['higher_edu'],
  'Corporate Learning & Development':     ['corporate', 'manufacturing', 'utilities'],
  'Healthcare Training':                  ['higher_edu', 'vocational', 'utilities'],
  'Sales Enablement':                     ['corporate', 'manufacturing'],
  'Onboarding & HR':                      ['manufacturing', 'utilities', 'corporate'],
  'Customer Education':                   ['manufacturing', 'corporate'],
  'Tourism & Heritage':                   ['museum', 'ngo'],
  'Government & Public Sector':           ['utilities', 'ngo'],
  'Other':                                ['corporate', 'higher_edu'],
}

// Map lead interest → example industry keywords
const INTEREST_TO_INDUSTRY: Record<string, string[]> = {
  'K-12 Education':                      ['education', 'school', 'k-12'],
  'Higher Education':                     ['education', 'university', 'higher'],
  'Corporate Learning & Development':     ['corporate', 'training', 'workplace', 'manufacturing'],
  'Healthcare Training':                  ['healthcare', 'medical', 'health', 'hospital'],
  'Sales Enablement':                     ['sales', 'retail', 'corporate'],
  'Onboarding & HR':                      ['corporate', 'workplace', 'manufacturing'],
  'Customer Education':                   ['education', 'training', 'corporate'],
  'Tourism & Heritage':                   ['tourism', 'museum', 'heritage', 'cultural'],
  'Government & Public Sector':           ['government', 'public', 'utilities'],
  'Other':                                ['training', 'learning', 'education'],
}

interface Testimonial {
  quote: string
  customer_details: string | null
  sector: string
}

interface Example {
  name: string
  embed_code: string
}

// ─────────────────────────────────────────
// Fetch relevant testimonials by sector
// ─────────────────────────────────────────
async function fetchTestimonials(interest: string): Promise<Testimonial[]> {
  const sectors = INTEREST_TO_SECTORS[interest] || ['corporate']
  const { data } = await supabaseAdmin
    .from('testimonials')
    .select('quote, customer_details, sector')
    .in('sector', sectors)
    .limit(20)

  if (!data || data.length === 0) return []

  const shuffled = [...data].sort(() => Math.random() - 0.5)
  const seen = new Set<string>()
  const selected: Testimonial[] = []
  for (const t of shuffled) {
    if (!seen.has(t.sector)) { seen.add(t.sector); selected.push(t) }
    if (selected.length >= 3) break
  }
  for (const t of shuffled) {
    if (selected.length >= 3) break
    if (!selected.includes(t)) selected.push(t)
  }
  return selected
}

// ─────────────────────────────────────────
// Fetch relevant ThingLink example embed
// ─────────────────────────────────────────
async function fetchExample(interest: string): Promise<Example | null> {
  const keywords = INTEREST_TO_INDUSTRY[interest] || ['training']

  for (const keyword of keywords) {
    const { data } = await supabaseAdmin
      .from('examples')
      .select('name, embed_code')
      .ilike('industry', `%${keyword}%`)
      .not('embed_code', 'is', null)
      .limit(10)

    if (data && data.length > 0) {
      return data[Math.floor(Math.random() * data.length)]
    }
  }

  // Fallback — any example with an embed
  const { data } = await supabaseAdmin
    .from('examples')
    .select('name, embed_code')
    .not('embed_code', 'is', null)
    .limit(10)

  if (!data || data.length === 0) return null
  return data[Math.floor(Math.random() * data.length)]
}

// ─────────────────────────────────────────
// Styled testimonial pull-quote block
// ─────────────────────────────────────────
function testimonialBlock(t: Testimonial): string {
  return `
<div style="border-left:4px solid #FF7B8B;padding:16px 20px;margin:28px 0;background:#fff8f9;border-radius:0 8px 8px 0;">
  <p style="font-size:16px;color:#111118;line-height:1.75;margin:0 0 10px;font-style:italic;">"${t.quote.replace(/^[""]|[""]$/g, '').replace(/"/g, '&quot;')}"</p>
  <p style="font-size:13px;color:#6b6b80;margin:0;font-weight:600;">— ${t.customer_details || 'ThingLink customer'}</p>
</div>`
}

// ─────────────────────────────────────────
// Insert example embed after first paragraph following second H2
// ─────────────────────────────────────────
function insertEmbed(body: string, example: Example): string {
  const embedBlock = `\n\nIn action! Explore this example.\n\n${example.embed_code}\n\n`
  const h2Matches = [...body.matchAll(/^## .+$/gm)]
  if (h2Matches.length < 2) return body + embedBlock

  const secondH2 = h2Matches[1]
  const afterH2 = secondH2.index! + secondH2[0].length
  const rest = body.slice(afterH2)
  const paraEnd = rest.search(/\n\n/)
  if (paraEnd === -1) return body + embedBlock

  const insertPos = afterH2 + paraEnd
  return body.slice(0, insertPos) + embedBlock + body.slice(insertPos)
}

// ─────────────────────────────────────────
// ThingLink CTA block — email-safe
// ─────────────────────────────────────────
const CTA_BLOCK = `
<div style="width:100%;max-width:560px;margin:32px 0;border-radius:14px;overflow:hidden;background:#CC80E0;background:linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%);padding:40px 48px;box-sizing:border-box;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <h3 style="font-size:22px;font-weight:600;color:#ffffff;margin:0 0 10px;line-height:1.3;">Ready to get started?</h3>
  <p style="font-size:15px;color:#ffffff;margin:0 0 24px;max-width:480px;display:inline-block;line-height:1.6;">Book a free 30-minute consultation with a ThingLink specialist and see exactly how it works for your organisation.</p>
  <br>
  <a href="https://www.thinglink.com/demo" style="display:inline-block;background:#0a2540;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:50px;text-decoration:none;">Book your free consultation →</a>
</div>`

// ─────────────────────────────────────────
// Main generation function
// ─────────────────────────────────────────
export async function generateResponse(input: LeadInput): Promise<GeneratedResponse> {
  const { name, company, role, interest, thinglinkContent, source } = input
  const firstName = name.split(' ')[0]

  // Fetch testimonials and example in parallel
  const [testimonials, example] = await Promise.all([
    fetchTestimonials(interest),
    fetchExample(interest),
  ])

  // First testimonial becomes the styled pull-quote; pass the rest to Claude for weaving in
  const [featuredTestimonial, ...otherTestimonials] = testimonials

  const testimonialsBlock = otherTestimonials.length > 0
    ? `\nRELEVANT CUSTOMER TESTIMONIALS (weave 1–2 naturally into the text as social proof — quote exactly, attributed correctly):\n` +
      otherTestimonials.map(t => `- "${t.quote}" — ${t.customer_details || 'ThingLink customer'}`).join('\n')
    : ''

  const systemPrompt = `You are a senior ThingLink solutions consultant writing a personalised one-pager for a prospect who has expressed interest.

ThingLink is a platform for creating interactive, immersive learning and communication experiences — including interactive images, videos, 360° tours, virtual environments, and AI-assisted scenario-based learning.

YOUR TONE:
- Warm, direct, and consultative — you're talking to a real person, not writing a brochure
- Confident but not salesy — focus on their specific challenge, not generic product features
- Use the prospect's first name occasionally to keep it personal
- Short paragraphs (2–4 sentences). Use H2 headings to break sections.
- Avoid jargon. Explain things clearly.

CONTENT RULES:
- Address their specific role and interest area throughout
- Use the provided testimonials as social proof — quote them exactly as given, attribute them correctly
- Do NOT invent statistics or case studies beyond what is provided
- Do NOT use horizontal rules (---) anywhere
- Reference ThingLink features that are genuinely relevant to their context
- Do NOT invent URLs — only use https://www.thinglink.com/demo as a CTA link

OUTPUT FORMAT: Respond with a single valid JSON object with these exact keys:
{
  "title": "string — personalised document title",
  "one_pager_md": "string — the full one-pager in markdown, 500–700 words, with H2 headings"
}`

  const contentContext = thinglinkContent ? `\nThingLink content they viewed: ${thinglinkContent}` : ''
  const sourceContext = source ? `\nCampaign / source: ${source}` : ''

  const userPrompt = `Write a personalised ThingLink one-pager for this prospect:

Name: ${name}
Company: ${company}
Role: ${role}
Primary interest: ${interest}${contentContext}${sourceContext}
${testimonialsBlock}

The one-pager should:
- Open by addressing ${firstName} directly and acknowledging their role at ${company}
- Explain how ThingLink is relevant to "${interest}" in 2–3 focused sections
- Each H2 section tackles a real challenge for a "${role}" and shows how ThingLink helps
- Include one section on getting started / next steps
- Be 500–700 words total`

  const response = await anthropic.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed: any
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error(`Failed to parse response: ${rawText.slice(0, 200)}`)
  }

  let body = parsed.one_pager_md || ''

  // Insert ThingLink example embed
  if (example) body = insertEmbed(body, example)

  // Insert featured testimonial pull-quote after first H2 paragraph
  if (featuredTestimonial) {
    const h2Match = body.match(/^## .+$/m)
    if (h2Match && h2Match.index !== undefined) {
      const afterH2 = h2Match.index + h2Match[0].length
      const rest = body.slice(afterH2)
      const paraEnd = rest.search(/\n\n/)
      if (paraEnd !== -1) {
        const insertPos = afterH2 + paraEnd
        body = body.slice(0, insertPos) + testimonialBlock(featuredTestimonial) + body.slice(insertPos)
      }
    }
  }

  // Append CTA
  body = body + '\n\n' + CTA_BLOCK

  return {
    title: parsed.title || `ThingLink for ${company}`,
    one_pager_md: body,
  }
}
