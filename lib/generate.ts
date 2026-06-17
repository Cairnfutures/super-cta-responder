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
  case_study_url: string | null
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
  const { data, error } = await supabaseAdmin
    .from('testimonials')
    .select('quote, customer_details, case_study_url, sector')
    .in('sector', sectors)
    .limit(20)

  console.log('[fetchTestimonials] sectors:', sectors, '| count:', data?.length ?? 0, '| error:', error)

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
// Normalise row — column may be embed_code or embed-code
// ─────────────────────────────────────────
function normaliseExample(row: any): Example | null {
  const embed = row['embed_code'] ?? row['embed-code'] ?? null
  if (!embed) return null
  return { name: row.name ?? '', embed_code: embed }
}

// ─────────────────────────────────────────
// Fetch relevant ThingLink example embed
// ─────────────────────────────────────────
async function fetchExample(interest: string): Promise<Example | null> {
  const keywords = INTEREST_TO_INDUSTRY[interest] || ['training']

  // Try industry column first, then project_type
  for (const column of ['industry', 'project_type']) {
    for (const keyword of keywords) {
      const { data } = await supabaseAdmin
        .from('examples')
        .select('*')
        .ilike(column, `%${keyword}%`)
        .limit(10)

      const rows = (data || []).map(normaliseExample).filter(Boolean) as Example[]
      if (rows.length > 0) return rows[Math.floor(Math.random() * rows.length)]
    }
  }

  // Fallback — any example
  const { data, error } = await supabaseAdmin
    .from('examples')
    .select('*')
    .limit(20)

  console.log('[fetchExample] fallback:', { count: data?.length ?? 0, error, cols: data?.[0] ? Object.keys(data[0]) : [] })

  const rows = (data || []).map(normaliseExample).filter(Boolean) as Example[]
  if (rows.length === 0) return null
  return rows[Math.floor(Math.random() * rows.length)]
}

// ─────────────────────────────────────────
// Styled testimonial pull-quote block
// ─────────────────────────────────────────
function testimonialBlock(t: Testimonial): string {
  const caseStudyLink = t.case_study_url && t.case_study_url.startsWith('http')
    ? `\n  <a href="${t.case_study_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:12px;font-size:13px;font-weight:600;color:#FF7B8B;text-decoration:none;">Read the case study →</a>`
    : ''
  return `
<div style="border-left:4px solid #FF7B8B;padding:16px 20px;margin:28px 0;background:#fff8f9;border-radius:0 8px 8px 0;">
  <p style="font-size:16px;color:#111118;line-height:1.75;margin:0 0 10px;font-style:italic;">"${t.quote.replace(/^[""]|[""]$/g, '').replace(/"/g, '&quot;')}"</p>
  <p style="font-size:13px;color:#6b6b80;margin:0;font-weight:600;">— ${t.customer_details || 'ThingLink customer'}</p>${caseStudyLink}
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

  const systemPrompt = `You are a senior ThingLink solutions consultant writing a personalised one-pager for a prospect. Your goal is to create something they'll genuinely find useful — specific, credible, and worth forwarding to a budget holder.

ABOUT THINGLINK:
ThingLink is an award-winning platform for creating interactive, immersive learning and communication experiences. Used in 150+ countries, it lets educators, trainers, and organisations build interactive images, videos, 360° scenes, virtual environments, branching scenarios, and AR experiences — all without coding. Winner of the UNESCO ICT in Education Prize 2018.

PRODUCTS & FEATURES — use these exact names:
- ThingLink Media Editor: The core creation tool — add hotspots, quizzes, video, audio, and links to any image, 360° scene, or video.
- ThingLink Scenario Builder: Branching decision-tree scenarios where learners navigate choices and consequences. Ideal for safety training, clinical skills, customer service, and complex procedures.
- Pano to 360°: Convert any panoramic photo into a fully interactive 360° immersive scene in minutes.
- ThingLink AR: Augmented reality experiences learners access on any mobile device — no headset required.
- AI-Assisted Course Creation: Use AI to generate interactive course outlines, quiz questions, and structured learning pathways from existing content.
- Immersive Reader: Built-in accessibility and translation tool — supports 60+ languages, text-to-speech, dyslexia fonts, and reading comprehension aids.
- Accessibility Player: WCAG 2.2 AA compliant playback. All content is fully accessible.
- LTI/SSO Integration: Works natively with Canvas, Blackboard, Moodle, Google Classroom, and Microsoft Teams — grades sync automatically.
- 360° Image Library: Shared library of professional 360° environments and scene templates to accelerate creation.
- Analytics & Checkpoints: Track learner progress, completion rates, and knowledge gaps through embedded interactive checkpoints.

PLANS BY SEGMENT:
- K-12: Essential (core creation tools, virtual field trips), Enhanced (AI-assisted course creation, 360° video, AR, SSO/LTI), Staff Training (professional development across a school or district)
- Higher Education / Further Education / VET: Department, College/School, Campus-Wide — scaling from a single faculty to institution-wide rollout
- Business / Corporate / Healthcare: Custom enterprise plans with advanced analytics, SSO, dedicated onboarding, and support

PROOF POINTS — use these where naturally relevant, never invent new ones:
- Winner of UNESCO ICT in Education Prize 2018
- WCAG 2.2 AA compliant — content is fully accessible to all learners
- Research at Keele University showed 96% positive student feedback on ThingLink-enhanced learning
- Works on any device: VR headsets, desktop, tablets, and mobile
- Integrates with Canvas, Blackboard, Moodle, Google for Education, Microsoft, and Canva
- 60+ languages via Immersive Reader — powerful for multilingual or international cohorts
- Used in 150+ countries

REAL CASE STUDIES — only reference these by name, and only when the prospect's sector matches:
- Gradia (Finland): Vocational institute — interactive 360° industrial workshops and safety training
- Energy Training Academy: ThingLink Scenario Builder for energy sector safety and compliance training
- Karelia University of Applied Sciences: 360° environments for hands-on vocational learning
- West Chester University: Immersive learning experiences across university departments
- HyGGe: Immersive social care and health education scenarios
- CAST: Accessible, inclusive educational content
- Keele University: Research showed 96% positive student feedback (Higher Ed context)
If the prospect's sector doesn't match any of the above, describe outcomes generically (e.g. "one vocational college in Finland") — do not invent named examples.

TONE & STYLE:
- Warm, direct, and consultative — you're a specialist talking to a real person, not writing a brochure
- Use the prospect's first name once or twice to keep it human
- Short paragraphs (2–4 sentences). Use H2 headings to structure sections clearly.
- Lead with outcomes for their specific role, not feature lists
- Avoid clichés: "cutting-edge", "game-changing", "seamless", "revolutionary", "transformative"
- Write as if you genuinely understand the challenges of their profession

STRUCTURE — follow this order:
1. **Opening paragraph** — address the prospect by name, acknowledge their role and the specific challenge in their interest area. Make it feel like a conversation, not a mailshot.
2. **## [Challenge heading]** — name the real pain point this segment faces. Be specific. One paragraph.
3. **## How ThingLink Can Help** — 2–3 features most relevant to their role and interest, each with a concrete outcome. Not a feature dump — show what changes for them.
4. **## What Results Look Like** — weave in the provided testimonials and 1–2 relevant proof points (UNESCO Prize, Keele University stat, WCAG compliance) where they fit naturally. Reference a named case study only if the sector matches.
5. **## Getting Started** — 1 paragraph on the most relevant plan tier(s) for their context, plus a warm next-step invitation (e.g. a 30-minute live demo where you build an example in their context together).

HARD RULES:
- Do NOT use horizontal rules (---) anywhere in the output
- Do NOT invent statistics, case studies, or URLs not listed above
- Do NOT include https://www.thinglink.com/demo in the body — the CTA block is added separately
- Do NOT mention a contact person's email address — handled elsewhere
- 500–700 words total for the one_pager_md

OUTPUT FORMAT: Respond with a single valid JSON object with these exact keys:
{
  "title": "string — MUST follow this exact format: 'An Introduction to ThingLink for [Company Name]' — replace [Company Name] with the prospect's actual company name, nothing else",
  "one_pager_md": "string — the full one-pager in markdown, 500–700 words, with H2 headings"
}`

  const contentContext = thinglinkContent ? `\nThingLink content they viewed: ${thinglinkContent}` : ''
  const sourceContext = source ? `\nCampaign / source: ${source}` : ''

  // Segment-specific feature suggestions to steer Claude
  const segmentFeatureHints: Record<string, string> = {
    'K-12 Education': 'Focus on: virtual field trips (Pano to 360°), AR tools for contextual learning, branching scenarios for critical thinking, Immersive Reader for diverse learners, LTI integration with school LMS. Relevant plans: Essential, Enhanced, Staff Training.',
    'Higher Education': 'Focus on: AI-Assisted Course Creation, Scenario Builder for active learning, Immersive Reader (60+ languages for international students), WCAG 2.2 AA compliance, LTI integration. Relevant plans: Department, College/School, Campus-Wide.',
    'Corporate Learning & Development': 'Focus on: Scenario Builder for realistic workplace situations, AI-assisted course creation from existing materials, 360° workplace tours, analytics to track completion, SSO integration with corporate systems. Mention Gradia or Energy Training Academy case study if appropriate.',
    'Healthcare Training': 'Focus on: Scenario Builder for clinical decision-making, 360° ward/facility tours for orientation, accessible content (WCAG 2.2 AA), AI-assisted course creation. Reference HyGGe or CAST if relevant.',
    'Sales Enablement': 'Focus on: interactive product demos, scenario-based role-play training, 360° showroom or facility tours, analytics on engagement.',
    'Onboarding & HR': 'Focus on: 360° workplace tours for remote/hybrid onboarding, interactive safety modules, branching scenarios for policy training, analytics and completion tracking, LMS integration.',
    'Customer Education': 'Focus on: interactive how-to content, 360° product or facility tours, multilingual support via Immersive Reader, embeddable content for any platform.',
    'Tourism & Heritage': 'Focus on: 360° virtual tours, multilingual visitor guides via Immersive Reader (60+ languages), interactive maps and exhibits, accessible on any device with no app download.',
    'Government & Public Sector': 'Focus on: accessible content (WCAG 2.2 AA), interactive training modules, 360° site familiarisation, multilingual support, analytics.',
    'Other': 'Focus on the 2–3 ThingLink features most relevant to their stated role. Prioritise Scenario Builder, AI-Assisted Course Creation, and LMS integration.',
  }

  const featureHint = segmentFeatureHints[interest] || segmentFeatureHints['Other']

  const userPrompt = `Write a personalised ThingLink one-pager for this prospect:

Name: ${name}
Company: ${company}
Role: ${role}
Primary interest: ${interest}${contentContext}${sourceContext}

${testimonialsBlock}

FEATURE FOCUS FOR THIS SEGMENT:
${featureHint}

INSTRUCTIONS:
1. Open by addressing ${firstName} directly — acknowledge their specific context as a ${role} at ${company} and name the challenge their segment faces. Make it feel like you know their world.
2. For "How ThingLink Can Help" — use the feature focus above. Describe 2–3 features with concrete outcomes for their role, not abstract capabilities. E.g. not "Scenario Builder creates branching scenarios" but "With Scenario Builder, your team can practice responding to difficult customer situations in a safe environment — before they face it in real life."
3. For "What Results Look Like" — weave in the provided customer quotes naturally. Add 1–2 proof points (UNESCO Prize 2018, 96% positive feedback from Keele University research, WCAG 2.2 AA) where they fit. Only name a case study from the approved list if the sector matches.
4. For "Getting Started" — name the specific plan tier(s) suited to ${company}'s context. Close with a warm, specific invitation: e.g. "I'd love to show you a 30-minute live demo — we can build an example in your context together."
5. Write 500–700 words total. Every sentence should earn its place.`

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
    title: parsed.title || `An Introduction to ThingLink for ${company}`,
    one_pager_md: body,
  }
}
