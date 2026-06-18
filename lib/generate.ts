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
  embedUrl?: string
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
  'VR / XR Experiences':                 ['manufacturing', 'corporate', 'higher_edu'],
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
  'VR / XR Experiences':                 ['General Enterprise', 'Manufacturing', 'Education'],
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
const LABEL = `font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 12px;`

function cleanQuote(q: string): string {
  return q.replace(/^[“”""]+|[“”""]+$/g, '').replace(/"/g, '&quot;')
}

function blockHeader(title: string, name: string, role: string, company: string): string {
  return `<div style="background:linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%);border-radius:12px;padding:36px 36px 32px;margin:0 0 14px;font-family:${FONT};">
  <img src="data:image/png;base64,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" alt="ThingLink" style="height:22px;width:auto;display:block;margin-bottom:18px;filter:brightness(0) invert(1);" />
  <p style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.1em;text-transform:uppercase;margin:0 0 10px;">Prepared for the ${role}</p>
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

function blockCaseStudy(parsed: any, example: Example | null, labels: any): string {
  const customerStoryLabel = labels?.customer_story || 'Customer Story'
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
  <p style="${LABEL}color:#CC80E0;">${customerStoryLabel}</p>
  <p style="font-size:14px;font-weight:600;color:#111118;margin:0 0 14px;">${parsed.case_study_customer || ''}</p>
  <p style="font-size:15px;color:#111118;line-height:1.8;margin:0 0 8px;font-style:italic;">"${cleanQuote(parsed.case_study_quote || '')}"</p>
  <p style="font-size:13px;color:#6b6b80;margin:0;font-weight:600;">— ${parsed.case_study_attribution || 'ThingLink customer'}</p>
  ${outcomes}
  ${caseStudyLink}
  ${embedHTML}
</div>`
}

function blockHowItWorks(bullets: string[], company: string, labels: any): string {
  const heading = labels?.how_it_works_heading || 'How This Would Work at'
  const items = (bullets || []).slice(0, 3).map(b =>
    `<li style="font-size:15px;color:#111118;line-height:1.7;margin:0 0 12px;padding-left:4px;">${b}</li>`
  ).join('')
  return `<div style="background:#f5f5f7;border-radius:12px;padding:24px 28px;margin:0 0 14px;font-family:${FONT};">
  <p style="${LABEL}color:#5CE8D4;">${heading} ${company}</p>
  <ul style="margin:0;padding:0 0 0 20px;list-style:disc;">
    ${items}
  </ul>
</div>`
}

function blockROI(text: string, labels: any): string {
  const heading = labels?.likely_outcomes || 'Likely Outcomes'
  return `<div style="background:#f0fff8;border-left:4px solid #5CE8D4;border-radius:0 12px 12px 0;padding:24px 28px;margin:0 0 14px;font-family:${FONT};">
  <p style="${LABEL}color:#5CE8D4;">${heading}</p>
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

function blockNextStep(company: string, role: string, interest: string, labels: any): string {
  const heading = labels?.cta_heading || 'Would you like to see this in action for your organisation?'
  const body = labels?.cta_body || "You are welcome to request a demo and we'll make it relevant to your ideas. Share a document, image, training resource, or piece of content you already use, and we'll tailor the session around it. We'll transform your material into a working ThingLink scenario and walk through it with you live, so you can see your own content brought to life rather than a generic demo."
  const buttonText = labels?.request_demo || 'Request a demo →'
  return `<div style="background:#0a2540;border-radius:12px;padding:32px 36px;margin:0 0 14px;font-family:${FONT};">
  <p style="font-size:18px;font-weight:700;color:#ffffff;margin:0 0 16px;line-height:1.4;">${heading}</p>
  <p style="font-size:15px;color:rgba(255,255,255,0.85);margin:0 0 24px;line-height:1.8;">${body}</p>
  <a href="https://www.thinglink.com/demo" target="_blank" rel="noopener noreferrer"
    style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;background:linear-gradient(135deg,#FFB347 0%,#FF7B8B 35%,#CC80E0 65%,#5CE8D4 100%);border-radius:50px;text-decoration:none;letter-spacing:-0.01em;font-family:${FONT};">
    ${buttonText}
  </a>
</div>`
}

// ─────────────────────────────────────────
// Main generation function
// ─────────────────────────────────────────
function looksLikeDomain(s: string): boolean {
  return /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}$/i.test(s.trim()) && !s.includes(' ')
}

function embedFromUrl(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split("/").filter(Boolean)
    const isScenario = parts.includes("mediacard") || u.pathname.includes("scenario")
    const id = [...parts].reverse().find(p => /^[0-9]+$/.test(p))
    if (!id) return null
    const base = isScenario ? "mediacard" : "card"
    return '<iframe src="' + "https://www.thinglink.com/" + base + "/" + id + '/embed" width="960" height="720" frameborder="0" scrolling="no" allowfullscreen style="max-width:100%;border-radius:8px;"></iframe>'
  } catch { return null }
}

export async function generateResponse(input: LeadInput): Promise<GeneratedResponse> {
  const { name, company, role, interest, language = 'English', thinglinkContent, embedUrl, source } = input
  const firstName = name.split(' ')[0]
  const domainMode = looksLikeDomain(company)

  const customEmbed = embedUrl ? embedFromUrl(embedUrl) : null
  const [testimonial, exampleBase, thumbnailUrl] = await Promise.all([
    fetchTestimonial(interest),
    fetchExample(interest),
    fetchAirtableThumbnail(interest),
  ])
  const example = customEmbed
    ? { name: '', embed_code: customEmbed, thumbnail_url: undefined }
    : exampleBase ? { ...exampleBase, thumbnail_url: thumbnailUrl ?? undefined } : null

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
Block 1 — Personalised hook (~40 words): Open by referencing their role and organisation. Do NOT use the prospect's first name anywhere in the one-pager. Name their specific role-level pain — not the industry generally. Write like a peer, not a vendor. Do NOT start with "Hi", "Hello", or "Dear".
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
  "roi": "Block 5 text (~55 words)",
  "labels": {
    "customer_story": "Customer Story",
    "how_it_works_heading": "How This Would Work at",
    "likely_outcomes": "Likely Outcomes",
    "cta_heading": "Would you like to see this in action for your organisation?",
    "cta_body": "You are welcome to request a demo and we'll make it relevant to your ideas. Share a document, image, training resource, or piece of content you already use, and we'll tailor the session around it. We'll transform your material into a working ThingLink scenario and walk through it with you live, so you can see your own content brought to life rather than a generic demo.",
    "request_demo": "Request a demo →"
  }
}

If writing in a language other than English, translate ALL label values above into that language. Keep the JSON keys in English.

Also include a "testimonial" object if a testimonial is provided below — translate the quote into the output language, keep the attribution as-is:
{
  "testimonial": {
    "quote": "[translated quote]",
    "attribution": "[unchanged original attribution]"
  }
}
If no testimonial is provided, omit the "testimonial" key entirely.`

  const domainInstruction = domainMode
    ? `\n\nIMPORTANT: The company field contains a domain name (${company}). Infer the full organisation name, sector, size, and country from this domain. Use the inferred organisation name (not the raw domain) in all copy — in the title, in block 4 ("How this would work at [Org Name]"), and throughout. State your inference briefly in the title field, e.g. "An Introduction to ThingLink for Acme Corp" not "An Introduction to ThingLink for acme.com".`
    : ''

  const testimonialContext = testimonial && language !== 'English'
    ? `\n\nTestimonial to translate:\nQuote: "${testimonial.quote}"\nAttribution: ${testimonial.customer_details || ''}`
    : ''

  const userPrompt = `Write a one-pager for:

Name: ${name}
Company: ${company}
Role: ${role}
Primary interest: ${interest}${contentContext}${sourceContext}${domainInstruction}${testimonialContext}

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
  const labels = parsed.labels || {}
  const blocks: string[] = [
    blockHeader(title, name, role, company),
    blockHook(parsed.hook || ''),
    blockReframe(parsed.reframe || ''),
    blockCaseStudy(parsed, example, labels),
    blockHowItWorks(parsed.how_it_works || [], company, labels),
    blockROI(parsed.roi || '', labels),
  ]

  if (testimonial) {
    // Use Claude's translated version if available, otherwise fall back to DB version
    const translatedTestimonial = parsed.testimonial?.quote
      ? { ...testimonial, quote: parsed.testimonial.quote }
      : testimonial
    blocks.push(blockTestimonial(translatedTestimonial))
  }
  blocks.push(blockNextStep(company, role, interest, labels))

  const printStyles = `<style>@media print{.tl-screen-embed{display:none!important;}.tl-print-thumb{display:block!important;}.tl-no-print{display:none!important;}}</style>`

  return {
    title,
    one_pager_md: printStyles + '\n' + blocks.join('\n'),
  }
}
