import { anthropic, GENERATION_MODEL } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export type OnePagerLength = 'short' | 'medium' | 'long'

export interface LeadInput {
  name: string
  company: string
  role: string
  interest: string
  length?: OnePagerLength
  language?: string
  thinglinkContent?: string
  source?: string
}

export interface GeneratedResponse {
  title: string
  one_pager_md: string
}

// ─────────────────────────────────────────
// Interest → sector/industry mappings
// ─────────────────────────────────────────
const INTEREST_TO_SECTORS: Record<string, string[]> = {
  'K-12 Education':                      ['k12'],
  'Higher Education':                     ['higher_edu'],
  'Corporate Learning & Development':     ['corporate', 'manufacturing'],
  'Healthcare Training':                  ['higher_edu', 'vocational'],
  'Sales Enablement':                     ['corporate', 'manufacturing'],
  'Onboarding & HR':                      ['manufacturing', 'corporate'],
  'Customer Education':                   ['manufacturing', 'corporate'],
  'Tourism & Heritage':                   ['museum', 'ngo'],
  'Government & Public Sector':           ['utilities', 'ngo'],
  'Other':                                ['corporate', 'higher_edu'],
}

const INTEREST_TO_INDUSTRY: Record<string, string[]> = {
  'K-12 Education':                      ['k12', 'Education'],
  'Higher Education':                     ['Higher Ed', 'Education', 'Vocational'],
  'Corporate Learning & Development':     ['General Enterprise', 'Manufacturing', 'Technology'],
  'Healthcare Training':                  ['Healthcare'],
  'Sales Enablement':                     ['General Enterprise', 'Retail', 'Technology'],
  'Onboarding & HR':                      ['General Enterprise', 'Manufacturing'],
  'Customer Education':                   ['General Enterprise', 'Technology', 'Education'],
  'Tourism & Heritage':                   ['Museum', 'Travel', 'Hospitality', 'Culture'],
  'Government & Public Sector':           ['Energy', 'Water', 'Charity', 'Transportation'],
  'Other':                                ['General Enterprise', 'Education'],
}

// ─────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────
interface Testimonial {
  quote: string
  customer_details: string | null
  case_study_url: string | null
  sector: string
}

interface Example {
  name: string
  embed_code: string
  thumbnail_url?: string
}

// ─────────────────────────────────────────
// Fetch one relevant testimonial (Block 6)
// ─────────────────────────────────────────
async function fetchTestimonial(interest: string): Promise<Testimonial | null> {
  const sectors = INTEREST_TO_SECTORS[interest] || ['corporate']
  const { data, error } = await supabaseAdmin
    .from('testimonials')
    .select('quote, customer_details, case_study_url, sector')
    .in('sector', sectors)
    .limit(10)

  console.log('[fetchTestimonial] sectors:', sectors, '| count:', data?.length ?? 0, '| error:', error)

  let rows = data || []
  if (rows.length === 0) {
    const { data: fallback } = await supabaseAdmin
      .from('testimonials')
      .select('quote, customer_details, case_study_url, sector')
      .limit(20)
    rows = fallback || []
  }

  if (rows.length === 0) return null
  return rows[Math.floor(Math.random() * rows.length)]
}

// ─────────────────────────────────────────
// Fetch thumbnail from Airtable (for PDF export)
// Requires AIRTABLE_PAT env var
// ─────────────────────────────────────────
async function fetchAirtableThumbnail(interest: string): Promise<string | null> {
  const pat = process.env.AIRTABLE_PAT
  if (!pat) return null

  const industries = INTEREST_TO_INDUSTRY[interest] || ['General Enterprise']
  // Build OR formula: OR(SEARCH("k12",{Industry}), SEARCH("Education",{Industry}))
  const formula = `OR(${industries.map(i => `SEARCH("${i}",{Industry})`).join(',')})`
  const url = `https://api.airtable.com/v0/appPHMNg3d6oLE6z6/tbl4RJtvnVQ5OoCsk?` +
    `filterByFormula=${encodeURIComponent(formula)}&fields[]=Thumb&maxRecords=15`

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${pat}` } })
    if (!res.ok) return null
    const json = await res.json()
    const records: any[] = (json.records || []).filter((r: any) => r.fields?.Thumb?.[0]?.thumbnails?.large?.url)
    if (records.length === 0) return null
    const picked = records[Math.floor(Math.random() * records.length)]
    return picked.fields.Thumb[0].thumbnails.large.url as string
  } catch {
    return null
  }
}

// ─────────────────────────────────────────
// Fetch relevant ThingLink example embed
// ─────────────────────────────────────────
function normaliseExample(row: any): Example | null {
  const embed = row['embed_code'] ?? row['embed-code'] ?? null
  if (!embed) return null
  return { name: row.name ?? '', embed_code: embed }
}

async function fetchExample(interest: string): Promise<Example | null> {
  const keywords = INTEREST_TO_INDUSTRY[interest] || ['training']

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

  const { data, error } = await supabaseAdmin.from('examples').select('*').limit(20)
  console.log('[fetchExample] fallback:', { count: data?.length ?? 0, error, cols: data?.[0] ? Object.keys(data[0]) : [] })
  const rows = (data || []).map(normaliseExample).filter(Boolean) as Example[]
  if (rows.length === 0) return null
  return rows[Math.floor(Math.random() * rows.length)]
}

// ─────────────────────────────────────────
// Block 7 — material type based on role
// ─────────────────────────────────────────
function getBlock7Material(role: string, interest: string): string {
  const r = role.toLowerCase()
  const i = interest.toLowerCase()
  if (r.includes('safety')) return 'site photo, toolbox-talk SOP, or near-miss debrief'
  if (r.includes('l&d') || r.includes('learning & development')) return 'induction document, training video, or course outline'
  if (r.includes('operations') || r.includes(' ops')) return 'SOP or shift handover doc'
  if (r.includes(' hr') || r.includes('people') || r.includes('onboarding')) return 'new-hire checklist or orientation material'
  if (r.includes('it ') || r.includes('technology') || r.includes('digital')) return 'integration spec or security requirements doc'
  if (i.includes('k-12') || r.includes('teacher') || r.includes('educator') || r.includes('headteacher')) return 'lesson plan, curriculum doc, or campus photo'
  if (i.includes('higher') || r.includes('professor') || r.includes('lecturer') || r.includes('dean')) return 'lesson plan, curriculum doc, or campus photo'
  if (i.includes('vocational') || i.includes('tvet')) return 'competence framework or training programme outline'
  if (i.includes('government') || i.includes('public sector')) return 'procedure, facility photo, or training brief'
  if (i.includes('tourism') || i.includes('museum') || i.includes('heritage')) return 'exhibit image, visitor guide, or venue photo'
  return 'document, photo, or training material'
}

// ─────────────────────────────────────────
// Styled HTML block builders
// ─────────────────────────────────────────
const FONT = `'Inter',sans-serif`
const BASE_TEXT = `font-size:15px;color:#111118;line-height:1.8;margin:0;`
const LABEL = `font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px;`

function cleanQuote(q: string): string {
  return q.replace(/^[“”""]+|[“”""]+$/g, '').replace(/"/g, '&quot;')
}

function blockHeader(title: string, name: string, role: string, company: string): string {
  return `<div style="background:linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%);border-radius:12px;padding:36px 36px 32px;margin:0 0 14px;font-family:${FONT};">
  <p style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.1em;text-transform:uppercase;margin:0 0 10px;">Prepared for ${name}, ${role}</p>
  <h1 style="font-size:26px;font-weight:800;color:#ffffff;margin:0;line-height:1.25;letter-spacing:-0.02em;">${title}</h1>
</div>`
}

function blockHook(text: string): string {
  return `<div style="background:#fff8f9;border-left:4px solid #FF7B8B;border-radius:0 12px 12px 0;padding:24px 28px;margin:0 0 14px;font-family:${FONT};">
  <p style="${BASE_TEXT}">${text}</p>
</div>`
}

function blockReframe(text: string): string {
  return `<div style="background:#fffbf0;border-left:4px solid #FFB347;border-radius:0 12px 12px 0;padding:24px 28px;margin:0 0 14px;font-family:${FONT};">
  <p style="${BASE_TEXT}">${text}</p>
</div>`
}

function blockCaseStudy(parsed: any, example: Example | null): string {
  const caseStudyLink = parsed.case_study_url && String(parsed.case_study_url).startsWith('http')
    ? `<a href="${parsed.case_study_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:14px;font-size:13px;font-weight:600;color:#FF7B8B;text-decoration:none;">Read the full case study →</a>`
    : ''
  const outcomes = parsed.case_study_outcomes && parsed.case_study_outcomes !== 'null'
    ? `<p style="font-size:13px;color:#111118;margin:12px 0 0;padding:10px 14px;background:#f5f5f7;border-radius:8px;font-weight:500;line-height:1.6;">${parsed.case_study_outcomes}</p>`
    : ''
  const embedHTML = example
    ? `<div class="tl-screen-embed" style="margin:20px 0;">${example.embed_code}</div>` +
      (example.thumbnail_url
        ? `<div class="tl-print-thumb" style="display:none;margin:20px 0;"><img src="${example.thumbnail_url}" style="width:100%;border-radius:8px;object-fit:cover;" alt="ThingLink example screenshot" /><p style="font-size:12px;color:#6b6b80;margin:6px 0 0;text-align:center;">View live at thinglink.com</p></div>`
        : `<div class="tl-print-thumb" style="display:none;margin:20px 0;padding:20px;background:#f5f5f7;border-radius:8px;text-align:center;"><p style="font-size:13px;color:#6b6b80;margin:0;">View this interactive example at thinglink.com</p></div>`)
    : ''
  return `<div style="background:#ffffff;border:1px solid #e4e4e9;border-radius:12px;padding:24px 28px;margin:0 0 14px;font-family:${FONT};">
  <p style="${LABEL}color:#CC80E0;">Customer Story</p>
  <p style="font-size:14px;font-weight:600;color:#111118;margin:0 0 14px;">${parsed.case_study_customer || ''}</p>
  <p style="font-size:15px;color:#111118;line-height:1.8;margin:0 0 8px;font-style:italic;">"${cleanQuote(parsed.case_study_quote || '')}"</p>
  <p style="font-size:13px;color:#6b6b80;margin:0;font-weight:600;">— ${parsed.case_study_attribution || 'ThingLink customer'}</p>
  ${outcomes}
  ${caseStudyLink}
  ${embedHTML}
</div>`
}

function blockHowItWorks(bullets: string[], company: string): string {
  const items = (bullets || []).slice(0, 3).map(b =>
    `<li style="font-size:15px;color:#111118;line-height:1.7;margin:0 0 12px;padding-left:4px;">${b}</li>`
  ).join('')
  return `<div style="background:#f5f5f7;border-radius:12px;padding:24px 28px;margin:0 0 14px;font-family:${FONT};">
  <p style="${LABEL}color:#5CE8D4;">How This Would Work at ${company}</p>
  <ul style="margin:0;padding:0 0 0 20px;list-style:disc;">
    ${items}
  </ul>
</div>`
}

function blockROI(text: string): string {
  return `<div style="background:#f0fff8;border-left:4px solid #5CE8D4;border-radius:0 12px 12px 0;padding:24px 28px;margin:0 0 14px;font-family:${FONT};">
  <p style="${LABEL}color:#5CE8D4;">Likely Outcomes</p>
  <p style="${BASE_TEXT}">${text}</p>
</div>`
}

function blockTestimonial(t: Testimonial): string {
  const link = t.case_study_url && t.case_study_url.startsWith('http')
    ? `\n  <a href="${t.case_study_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:12px;font-size:13px;font-weight:600;color:#FF7B8B;text-decoration:none;">Read the case study →</a>`
    : ''
  return `<div style="border-left:4px solid #FF7B8B;padding:16px 20px;margin:0 0 14px;background:#fff8f9;border-radius:0 8px 8px 0;font-family:${FONT};">
  <p style="font-size:15px;color:#111118;line-height:1.75;margin:0 0 10px;font-style:italic;">"${cleanQuote(t.quote)}"</p>
  <p style="font-size:13px;color:#6b6b80;margin:0;font-weight:600;">— ${t.customer_details || 'ThingLink customer'}</p>${link}
</div>`
}

function blockNextStep(company: string, role: string, interest: string): string {
  const material = getBlock7Material(role, interest)
  return `<div style="background:#0a2540;border-radius:12px;padding:32px 36px;margin:0 0 14px;font-family:${FONT};">
  <p style="font-size:15px;font-weight:700;color:#ffffff;margin:0 0 14px;line-height:1.5;">One way to take this forward — and it isn't a demo deck.</p>
  <p style="font-size:15px;color:rgba(255,255,255,0.85);margin:0 0 14px;line-height:1.75;">Reply to this email with something from your own world: a ${material} from ${company}. We'll transform it into a working ThingLink scenario and walk through it live with you in a 30-minute session — so you see ${company} inside ThingLink, not a generic demo.</p>
  <p style="font-size:14px;color:rgba(255,255,255,0.65);margin:0;line-height:1.6;">A paid 90-day pilot starts at €15,000 and ends with measurable evidence — not a slide deck.</p>
</div>`
}

// ─────────────────────────────────────────
// Main generation function
// ─────────────────────────────────────────
export async function generateResponse(input: LeadInput): Promise<GeneratedResponse> {
  const { name, company, role, interest, language = 'English', thinglinkContent, source } = input
  const firstName = name.split(' ')[0]

  const [testimonial, exampleBase, thumbnailUrl] = await Promise.all([
    fetchTestimonial(interest),
    fetchExample(interest),
    fetchAirtableThumbnail(interest),
  ])
  const example = exampleBase ? { ...exampleBase, thumbnail_url: thumbnailUrl ?? undefined } : null

  const languageInstruction = language !== 'English'
    ? `\n\nIMPORTANT: Write the entire one-pager in ${language}. All headings, body text, and labels must be in ${language}.`
    : ''

  const contentContext = thinglinkContent ? `\nThingLink content they viewed: ${thinglinkContent}` : ''
  const sourceContext = source ? `\nCampaign / source: ${source}` : ''

  const systemPrompt = `You are a senior ThingLink solutions consultant writing a personalised one-pager for a prospect. Follow the 7-block structure below exactly. Total words for blocks 1–5: 320–380.

ABOUT THINGLINK:
ThingLink is an award-winning platform for creating interactive, immersive learning experiences — virtual tours, branching scenarios, 360° environments, and AR. Used in 150+ countries. No coding required. Works on any device. Winner of the UNESCO ICT in Education Prize 2018.

APPROVED CASE STUDIES — pick the single best match for the prospect's sector. Never invent one not on this list:
- Mitsubishi Electric UK (manufacturing/industrial): Multi-site VR safety and technical training deployed across multiple countries. Quote: "Hand on heart — ThingLink has been a joy to work with as it's so straightforward to figure out." Steve Clark, Technical Trainer. URL: https://www.thinglink.com/blog/how-mitsubishi-electric-is-creating-innovative-vr-training-with-thinglink/
- Stora Enso (manufacturing/industrial): VR safety training in 11 languages across global mill sites. Higher engagement and completion rates. Quote: "We now have training in 11 languages. Employees enjoy the training and that's reflected in higher engagement and completion rates." Jolanta, Safety Manager. URL: https://www.thinglink.com/blog/innovative-vr-safety-training-at-stora-enso-with-thinglink-and-meta-quest/
- Fingrid (utilities/energy): Interactive substation navigation and safety inductions for Finland's national electricity grid. Quote: "ThingLink improves security and makes navigating the substations much easier." Veijo Siiankoski. URL: https://www.thinglink.com/blog/cost-effective-carbon-efficient-and-safe-inductions/
- Energy Training Academy (vocational/energy): Virtual facility tours for energy efficiency training. Hundreds of learners virtually visiting the academy. Quote: "ThingLink enables us to virtually bring hundreds of schoolchildren into the academy, making our energy efficiency training both engaging and interactive." Andrew Lamond, Director. URL: https://www.thinglink.com/blog/virtual-tour-of-facilities-brings-learners-to-the-energy-training-academy/
- Keele University (higher education): 360° virtual field trips for Geography. Research showed 96% positive student feedback. Luke Hobson, Technician, School of Geography. URL: null
- University of Hertfordshire (higher education): Escape room for student inductions. Overwhelmingly positive feedback since 2022, staff freed up during busy periods. Louise Conway, Information Manager. URL: https://www.thinglink.com/blog/hundreds-of-student-inductions-delivered-with-a-thinglink-virtual-escape-room/
- Stanford University (K-12 education): Virtual field trips for peer learning and student creation. Rachel Wolf, Virtual Field Trips project team. Quote: "When we talk about Collaborative Learning, Peer Learning and Peer feedback, it's a fabulous platform — that's something that all of the Educators and the students rave about!" URL: https://www.thinglink.com/blog/empowering-place-based-learning-through-student-creation-with-stanfords-virtual-learning-resources/
- Tiffany & Co (corporate/retail L&D): Scenario Builder for retail learning and development. Jason O'Brien, Manager of Instructional Design. Quote: "Creating diverse situations with corresponding results was seamless. The end-of-scenario summary allows learners to receive feedback in the moment." URL: null
- V&A Dundee (museum/heritage): Interactive digital exhibits, no staff training needed for the tool. Julie Muir, Learning Manager. Quote: "It shows ThingLink's ease of use that we haven't needed to do any staff training on it. It's so intuitive." URL: https://www.thinglink.com/blog/va-dundee-widens-access-with-thinglink/
- WaterAid (NGO): Immersive 360° supporter experience for fundraising and awareness. Alicia Robinson, Digital Content and Experience Lead. URL: https://www.thinglink.com/blog/interactive-360-experience-wateraid/

APPROVED ROI RANGES (Block 5 — pick 2–3 most applicable to their sector, always as ranges, always include the source line):
- Manufacturing/Utilities/Industrial: 30–50% reduction in induction and multi-site travel costs; 40–60% faster time-to-site-readiness for new starters and contractors; measurable improvement in safety-critical decision accuracy
- Corporate L&D/Onboarding: 25–40% faster onboarding to full productivity; 20–35% reduction in content production time; measurable improvement in assessment and retention scores
- K-12 Education: 20–40% improvement in learner engagement and task completion; 30–50% reduction in educator content-creation time; improved accessibility outcomes across all learner types
- Higher Education: 25–40% reduction in time creating interactive content; improvement in learner satisfaction and completion scores; multilingual accessibility for international cohorts
- Healthcare: 25–45% reduction in clinical induction time; improvement in scenario-based training completion rates; accessible content for diverse learner groups
- Tourism/Heritage/NGO: expanded digital reach to audiences who cannot attend in person; reduced dependency on in-person staff for orientation; multilingual visitor access

BLOCK RULES:
Block 1 — Personalised hook (~40 words): Open with the prospect's first name in the first sentence. Name their specific role-level pain — not the industry generally. Write like a peer, not a vendor. Do NOT start with "Hi", "Hello", or "Dear".
Block 2 — Real-problem reframe (~35 words): One sentence naming the pain they think they have. One sentence reframing it to the bigger, budget-level pain.
Block 3 — Case study (~70 words): Exactly one customer from the approved list, best match by sector. Format: company name + one framing sentence + one exact quote from the approved list + 1–2 outcome figures where available (ranges only, verified only). Include the URL if one is listed.
Block 4 — How this would work (~90 words): Exactly three bullets. Each leads with what they GET (outcome), not the product feature name. Each bullet ends tied to their specific environment. Do NOT use product names: Scenario Builder, Pano to 360°, Media Editor, ThingLink AR.
Block 5 — Likely outcomes (~55 words): Open with "For an organisation of [Company]'s scale, comparable customers typically see..." Use 2–3 ranges from the approved list. Close with "Based on outcomes from comparable [sector] customers."

TONE:
- Warm and direct — a specialist talking to a real person, not a brochure
- Short sentences. No filler.
- Do NOT use em dashes. Use commas or full stops.
- Do NOT use hyphens to join words unless the word requires it

HARD RULES:
- Do NOT mention plan tiers, pricing, or "Getting Started"
- Do NOT include "About ThingLink" or any company overview
- Do NOT use "book a demo", "book a consultation", or similar CTA language anywhere
- Do NOT invent case studies, statistics, or URLs not in the approved list
- Do NOT wrap the JSON in markdown code blocks or backticks
- Do NOT use horizontal rules (---)
- Blocks 1–5: 320–380 words total

OUTPUT — raw JSON only, no code block wrapper:
{
  "title": "An Introduction to ThingLink for [Company Name]",
  "hook": "Block 1 text (~40 words)",
  "reframe": "Block 2 text (~35 words)",
  "case_study_customer": "Company Name — one framing sentence",
  "case_study_quote": "Exact quote from approved list",
  "case_study_attribution": "First name Last name, Role, Company",
  "case_study_outcomes": "Outcome 1 · Outcome 2 (ranges or verified figures only — null if none available)",
  "case_study_url": "URL from approved list or null",
  "how_it_works": ["Bullet 1 (~30 words)", "Bullet 2 (~30 words)", "Bullet 3 (~30 words)"],
  "roi": "Block 5 text (~55 words)"
}`

  const userPrompt = `Write a one-pager for:

Name: ${name}
Company: ${company}
Role: ${role}
Primary interest: ${interest}${contentContext}${sourceContext}

Pick the single best-matching case study from the approved list for their sector.
Tie all three bullets in block 4 to ${company}'s specific environment — their sites / wards / classrooms / stores / fleet (whatever fits their world).
Use ROI ranges from the approved list that best match ${interest}.${languageInstruction}`

  const response = await anthropic.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed: any
  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error(`Failed to parse response: ${rawText.slice(0, 200)}`)
  }

  // Assemble the 7 styled blocks
  const title = parsed.title || `An Introduction to ThingLink for ${company}`
  const blocks: string[] = [
    blockHeader(title, name, role, company),
    blockHook(parsed.hook || ''),
    blockReframe(parsed.reframe || ''),
    blockCaseStudy(parsed, example),
    blockHowItWorks(parsed.how_it_works || [], company),
    blockROI(parsed.roi || ''),
  ]

  if (testimonial) blocks.push(blockTestimonial(testimonial))
  blocks.push(blockNextStep(company, role, interest))

  const printStyles = `<style>@media print{.tl-screen-embed{display:none!important;}.tl-print-thumb{display:block!important;}.tl-no-print{display:none!important;}}</style>`

  return {
    title,
    one_pager_md: printStyles + '\n' + blocks.join('\n'),
  }
}
