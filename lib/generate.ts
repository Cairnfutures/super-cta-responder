import { anthropic, GENERATION_MODEL } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface LeadInput {
  name: string
  email: string
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
// Map lead interest area → testimonial sectors
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

interface Testimonial {
  quote: string
  customer_details: string | null
  case_study_url: string | null
  sector: string
}

async function fetchTestimonials(interest: string): Promise<Testimonial[]> {
  const sectors = INTEREST_TO_SECTORS[interest] || ['corporate']
  const { data } = await supabaseAdmin
    .from('testimonials')
    .select('quote, customer_details, case_study_url, sector')
    .in('sector', sectors)
    .limit(20)

  if (!data || data.length === 0) return []

  // Shuffle and return 3 diverse quotes (one per sector where possible)
  const shuffled = [...data].sort(() => Math.random() - 0.5)
  const seen = new Set<string>()
  const selected: Testimonial[] = []
  for (const t of shuffled) {
    if (!seen.has(t.sector)) {
      seen.add(t.sector)
      selected.push(t)
    }
    if (selected.length >= 3) break
  }
  // Fill up to 3 if we didn't get one per sector
  for (const t of shuffled) {
    if (selected.length >= 3) break
    if (!selected.includes(t)) selected.push(t)
  }
  return selected
}

// ─────────────────────────────────────────
// ThingLink CTA block — email-safe
// No external font links; bgcolor fallback for Outlook; inline styles only
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
  const { name, email, company, role, interest, thinglinkContent, source } = input

  const firstName = name.split(' ')[0]

  // Fetch relevant testimonials in parallel with generation setup
  const testimonials = await fetchTestimonials(interest)

  const testimonialsBlock = testimonials.length > 0
    ? `\nRELEVANT CUSTOMER TESTIMONIALS (weave 1–2 of these naturally into the one-pager as social proof — quote them exactly, attributed to the customer):\n` +
      testimonials.map(t => `- "${t.quote}" — ${t.customer_details || 'ThingLink customer'}`).join('\n')
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
- Do NOT invent statistics or case studies beyond what is provided in the testimonials
- Do NOT use horizontal rules (---) anywhere
- Reference ThingLink features that are genuinely relevant to their context
- End with a clear, single CTA pointing to https://www.thinglink.com/demo
- Do NOT invent URLs — only use https://www.thinglink.com/demo as a CTA link

OUTPUT FORMAT: Respond with a single valid JSON object with these exact keys:
{
  "title": "string — personalised document title, e.g. 'ThingLink for Acme Corp: How Interactive Learning Can Transform Your Training'",
  "one_pager_md": "string — the full one-pager in markdown, 500–700 words, with H2 headings"
}`

  const contentContext = thinglinkContent
    ? `\nThingLink content they viewed: ${thinglinkContent}`
    : ''

  const sourceContext = source ? `\nCampaign / source: ${source}` : ''

  const userPrompt = `Write a personalised ThingLink one-pager for this prospect:

Name: ${name}
Email: ${email}
Company: ${company}
Role: ${role}
Primary interest: ${interest}${contentContext}${sourceContext}
${testimonialsBlock}

The one-pager should:
- Open by addressing ${firstName} directly and acknowledging their role at ${company}
- Explain how ThingLink is specifically relevant to "${interest}" in 2–3 focused sections
- Each H2 section should tackle a real challenge people in the "${role}" role face and show how ThingLink helps
- Weave in 1–2 of the provided testimonials as real-world proof points
- Include one section on getting started / next steps
- Close with a warm, encouraging sign-off and a single CTA to book a demo at https://www.thinglink.com/demo
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

  const bodyWithCTA = (parsed.one_pager_md || '') + '\n\n' + CTA_BLOCK

  return {
    title: parsed.title || `ThingLink for ${company}`,
    one_pager_md: bodyWithCTA,
  }
}
