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

// Map sector → segment display name
const SECTOR_TO_SEGMENT: Record<string, string> = {
  k12:           'K-12 Education',
  higher_edu:    'Higher Education',
  vocational:    'Technical and Vocational Skills Training',
  corporate:     'Corporate Learning & Development',
  manufacturing: 'Manufacturing',
  utilities:     'Utilities',
  museum:        'Tourism & Heritage',
  ngo:           'Government & Public Sector',
}

const rows = [
  // ── K-12 ──────────────────────────────────────────────────────────────
  {
    sector: 'k12',
    quote: "When we talk about Collaborative Learning, Peer Learning and Peer feedback, it's a fabulous platform — that's something that all of the Educators and the students rave about!",
    customer_details: 'Rachel Wolf, Virtual Field Trips project team, Stanford Accelerator for Learning',
    case_study_url: 'https://www.thinglink.com/blog/empowering-place-based-learning-through-student-creation-with-stanfords-virtual-learning-resources/',
  },
  {
    sector: 'k12',
    quote: "It's the next frontier of how to make the classroom engaging! We need to immerse students in their learning environments so that they want to be at school.",
    customer_details: "Joseph D'Aquila, Teacher, Toronto Catholic District Schools Board",
    case_study_url: 'https://www.thinglink.com/blog/how-a-toronto-teacher-combines-thinglink-and-ai-to-better-engage-students-in-online-learning/',
  },
  {
    sector: 'k12',
    quote: "I've never seen such enthusiasm for a task in any class that I can ever remember. The girls loved it. They all want to do more. Without ThingLink, creating something like this would be impossible.",
    customer_details: 'Rob McCrae, Teacher, Diocesan School for Girls, Auckland',
    case_study_url: null,
  },
  {
    sector: 'k12',
    quote: "It was a sad day when we had to say goodbye to Google Street View — and a very happy day when ThingLink came to the rescue with Pano to 360!",
    customer_details: 'Amanda Brougham-Pickard, Educator',
    case_study_url: null,
  },
  {
    sector: 'k12',
    quote: "Our students create digital escape rooms with ThingLink. They really enjoy it!",
    customer_details: 'Dr. Susan Murray, Educational Technology Coordinator, Oak Hill Academy',
    case_study_url: null,
  },
  {
    sector: 'k12',
    quote: "It's so easy I can teach it to 1st graders. ThingLink catches the eye and makes you want to see what's behind those magic dots. ThingLink is constantly growing its product, which means the possibilities are endless.",
    customer_details: 'Craig Dunlap, Elementary School Teacher',
    case_study_url: null,
  },
  {
    sector: 'k12',
    quote: "ThingLink is not just a tool. It is a supportive community designed to provide teachers with rich, interactive experiences that engage learners and immerses them into worlds they may not possibly be able to experience otherwise.",
    customer_details: 'Laura Moore, Classroom Teacher (quoted in UNESCO Report 2021)',
    case_study_url: 'https://unesdoc.unesco.org/ark:/48223/pf0000380189',
  },
  // ── Higher Education ──────────────────────────────────────────────────
  {
    sector: 'higher_edu',
    quote: "If you can think it, you can create it in ThingLink. Everything I've ever envisioned, I've been able to do with the platform.",
    customer_details: 'Tyler Counsil, CAST Director',
    case_study_url: 'https://www.thinglink.com/blog/thinglink-virtual-environments-and-scenarios-enhance-child-protection-training/',
  },
  {
    sector: 'higher_edu',
    quote: "What we loved most about the tool was that you don't need to be a developer to build tours; you can build engaging interactions really easily. We needed to deploy a tour quickly and easily and ThingLink really helped us do that.",
    customer_details: 'Wade Holdraker, AVP Digital Strategy, University of Rochester Medical Center',
    case_study_url: 'https://www.thinglink.com/blog/campus-visit-experience/',
  },
  {
    sector: 'higher_edu',
    quote: "The interface is very intuitive. I find that it's a great way of conveying a lot of information in a way that people naturally process.",
    customer_details: 'Dr Sarah Fielding, Digital Learning Team Manager, Southampton University',
    case_study_url: 'https://www.thinglink.com/blog/next-level-field-trips/',
  },
  {
    sector: 'higher_edu',
    quote: "One of the greatest strengths of the ThingLink platform is its simplicity and user-friendliness, allowing users to easily create and disseminate immersive, interactive learning materials with very little training time.",
    customer_details: 'Jeffery et al, Journal of Chemical Education, May 2022',
    case_study_url: 'https://www.thinglink.com/blog/thinglink-evidence-of-impact/',
  },
  {
    sector: 'higher_edu',
    quote: "ThingLink has been a fantastic addition to our start-of-term activities, receiving overwhelmingly positive feedback since we launched the escape room in 2022. This success has allowed staff to dedicate more time to students during these busy periods.",
    customer_details: 'Louise Conway, Information Manager, University of Hertfordshire',
    case_study_url: 'https://www.thinglink.com/blog/hundreds-of-student-inductions-delivered-with-a-thinglink-virtual-escape-room/',
  },
  {
    sector: 'higher_edu',
    quote: "ThingLink makes it really easy for anyone to do. I wouldn't have a clue how to put anything together like this using any other software. So far we've had a positive response from both academic staff and prospective students.",
    customer_details: 'Luke Hobson, Technician, School of Geography, Keele University',
    case_study_url: null,
  },
  {
    sector: 'higher_edu',
    quote: "My students LOVE the Immersive Reader — it comes up a lot in module reviews.",
    customer_details: 'Lisa Gee, Learning Technologist',
    case_study_url: null,
  },
  {
    sector: 'higher_edu',
    quote: "For me ThingLink has been a spark for creativity and imagination. Whenever I have an idea I immediately turn to ThingLink because I know there is a way to accomplish my goals in a way that considers accessibility, inclusion, and privacy.",
    customer_details: 'Jessica Henderson, Learning Technologist, University',
    case_study_url: null,
  },
  // ── Vocational / Technical ────────────────────────────────────────────
  {
    sector: 'vocational',
    quote: "ThingLink enables us to virtually bring hundreds of schoolchildren into the academy, making our energy efficiency training both engaging and interactive. Through this technology, we aim to make learning about energy exciting and accessible.",
    customer_details: 'Andrew Lamond, Director, Energy Training Academy',
    case_study_url: 'https://www.thinglink.com/blog/virtual-tour-of-facilities-brings-learners-to-the-energy-training-academy/',
  },
  {
    sector: 'vocational',
    quote: "We have created ThingLinks for our Construction course delivery. Great for highlighting hazards without endangering our students.",
    customer_details: 'Kate Whyles, Nottingham College',
    case_study_url: null,
  },
  {
    sector: 'vocational',
    quote: "ThingLink has been a great platform for both myself and learners. The platform is simple and effortless to navigate and is now a big part of my course overall, including in-class assessments and online learning.",
    customer_details: 'Jack Lawson, Training Manager, Historic Environment Scotland',
    case_study_url: null,
  },
  // ── Corporate / L&D ──────────────────────────────────────────────────
  {
    sector: 'corporate',
    quote: "ThingLink Scenario Builder allows for rapid mapping of scenarios in multiple formats and situations; creating diverse situations with corresponding results was seamless. The end-of-scenario summary allows learners to receive feedback in the moment.",
    customer_details: "Jason O'Brien, Manager of Instructional Design, Tiffany & Co",
    case_study_url: null,
  },
  {
    sector: 'corporate',
    quote: "ThingLink is the best and most easily used software to bring technology into education. I'm a Learning Technologist and I promote ThingLink more than any other software.",
    customer_details: 'Nick Bartlett, Learning Technologist',
    case_study_url: null,
  },
  // ── Manufacturing ────────────────────────────────────────────────────
  {
    sector: 'manufacturing',
    quote: "Hand on heart — ThingLink has been a joy to work with as it's so straightforward to figure out.",
    customer_details: 'Steve Clark, Technical Trainer, Mitsubishi Electric UK',
    case_study_url: 'https://www.thinglink.com/blog/how-mitsubishi-electric-is-creating-innovative-vr-training-with-thinglink/',
  },
  {
    sector: 'manufacturing',
    quote: "Using a combination of real-life 360 and 3D content with interactive simulation scenarios, ThingLink has helped us develop much more realistic training materials than our employees have seen before. Employees enjoy the training and that's reflected in higher engagement and completion rates.",
    customer_details: 'Jolanta, Safety Manager, Stora Enso',
    case_study_url: 'https://www.thinglink.com/blog/innovative-vr-safety-training-at-stora-enso-with-thinglink-and-meta-quest/',
  },
  {
    sector: 'manufacturing',
    quote: "ThingLink matches our technological expertise in our field. We need to show that we are thought leaders in our space — and this goes hand in hand with using ThingLink to demonstrate these solutions.",
    customer_details: 'Dakota Hoeppner, Marketing Communications Specialist, Carmanah',
    case_study_url: 'https://www.thinglink.com/blog/multi-use-interactive-content-trade-shows-website/',
  },
  {
    sector: 'manufacturing',
    quote: "ThingLink content is easy to create, and easy to use.",
    customer_details: "KAESER, leading manufacturer of compressed air products",
    case_study_url: 'https://thinglink.com/blog/kaesers-360-virtual-tours-provide-a-unique-way-for-customers-to-explore-products-remotely/',
  },
  // ── Utilities ─────────────────────────────────────────────────────────
  {
    sector: 'utilities',
    quote: "ThingLink has been seen as a very good tool — today's application improves security and makes navigating the substations much easier.",
    customer_details: "Veijo Siiankoski, Fingrid — Finland's national electricity grid",
    case_study_url: 'https://www.thinglink.com/blog/cost-effective-carbon-efficient-and-safe-inductions/',
  },
  {
    sector: 'utilities',
    quote: "It's much easier for staff to go into the field with this kind of support. You can be confident that that person is doing their job correctly.",
    customer_details: 'Patryk Wojtowicz, Smart Water Group, Savonia UAS',
    case_study_url: 'https://thinglink.com/blog/thinglinks-new-ar-app-helps-keep-water-flowing',
  },
  {
    sector: 'utilities',
    quote: "In this situation there wouldn't be any better way to represent this educationally.",
    customer_details: 'Heini Snellman, Environmental Specialist, HSY (Helsinki Region Environmental Services)',
    case_study_url: 'https://thinglink.com/blog/hsy-partners-with-thinglink/',
  },
  // ── Museums / Heritage ────────────────────────────────────────────────
  {
    sector: 'museum',
    quote: "It shows ThingLink's ease of use that we haven't needed to do any staff training on it. It's so intuitive. It's very, very user friendly.",
    customer_details: 'Julie Muir, Learning Manager, V&A Dundee',
    case_study_url: 'https://www.thinglink.com/blog/va-dundee-widens-access-with-thinglink/',
  },
  {
    sector: 'museum',
    quote: "ThingLink has been a GAME CHANGER for both our programs and our Professional Development. It's so responsive — we can update it ourselves in 30 seconds. It's able to change and adapt as we do.",
    customer_details: 'Royal Ontario Museum, Toronto',
    case_study_url: 'https://www.thinglink.com/blog/roms-virtual-tours-solve-access-issues/',
  },
  {
    sector: 'museum',
    quote: "It puts more of our content in one place, helping to streamline focus. It provides a broad picture but you can dive into the parts that you want to. It provides the different levels that different learners need.",
    customer_details: 'Julie Muir, Learning Manager, V&A Dundee',
    case_study_url: 'https://www.thinglink.com/blog/va-dundee-widens-access-with-thinglink/',
  },
  // ── NGO / Non-profit ─────────────────────────────────────────────────
  {
    sector: 'ngo',
    quote: "ThingLink delivers an immersive online experience for our supporters, so that they can meet the residents of Tombohuaun, Sierra Leone, and explore what life is like there.",
    customer_details: 'Alicia Robinson, Digital Content and Experience Lead, WaterAid',
    case_study_url: 'https://www.thinglink.com/blog/interactive-360-experience-wateraid/',
  },
]

const testimonials = rows.map(r => ({ ...r, segment: SECTOR_TO_SEGMENT[r.sector] ?? r.sector }))

async function main() {
  console.log(`Inserting ${testimonials.length} testimonials...`)
  const { data, error } = await sb.from('testimonials').insert(testimonials).select()
  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`Done! Inserted ${data?.length ?? 0} rows.`)
  }
}

main()
