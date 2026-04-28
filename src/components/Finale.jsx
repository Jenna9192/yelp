import { useRef, useState, useEffect } from 'react'
import './Finale.css'

const TAKEAWAYS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 5v3h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    color: '#d32323',
    heading: 'Get on delivery platforms',
    stat: '+29%',
    bullets: [
      'Delivery is the #1 survival predictor across all 16 features tested',
      'Outranks star rating by nearly 3× as a survival signal',
      'DoorDash, Uber Eats — visibility during low foot-traffic periods matters',
    ],
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h8M8 14h5"/>
      </svg>
    ),
    color: '#e07b39',
    heading: 'Chase reviews, not just stars',
    stat: '2×',
    bullets: [
      'Review volume predicts survival more than average rating alone',
      'More reviews = more algorithmic visibility on Yelp',
      'Prompt guests via receipts, loyalty cards, follow-up texts',
    ],
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    color: '#4e9e6e',
    heading: 'Aim for the rating sweet spot',
    stat: '4–4.5★',
    bullets: [
      'The 4.0–4.5★ band shows the highest survival rate in our dataset',
      'Over-hyped 4.8–5★ restaurants face higher expectation and backlash',
      'Consistent, honest quality outlasts perfection-chasing',
    ],
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <line x1="8" y1="10" x2="16" y2="10"/>
      </svg>
    ),
    color: '#5b8dd9',
    heading: 'Rethink groups & reservations',
    stat: '−18%',
    bullets: [
      'Group-friendly venues show 18% lower survival odds',
      'Reservation-based models show 14% lower survival — no-shows hurt',
      'Walk-in and repeat customer traffic is more resilient',
    ],
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
    ),
    color: '#9b6fca',
    heading: 'Your review language is your brand',
    stat: '0 overlap',
    bullets: [
      '"Amazing," "fresh," "flavor" dominate 4.5★ reviews',
      '"Minutes," "manager," "told" dominate 1★ reviews',
      'Zero word overlap between top and bottom tiers — clear signal of brand identity',
    ],
  },
]

function TakeawayCard({ icon, color, heading, bullets, stat, index, inView }) {
  return (
    <div
      className="fn-card"
      style={{
        '--color': color,
        '--delay': `${index * 80}ms`,
        opacity:   inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${index * 80}ms, transform 0.6s ease ${index * 80}ms`,
      }}
    >
      <div className="fn-card-icon" style={{ color }}>{icon}</div>
      <div className="fn-card-stat" style={{ color }}>{stat}</div>
      <div className="fn-card-heading">{heading}</div>
      <ul className="fn-card-bullets">
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  )
}

export default function Finale() {
  const sectionRef = useRef(null)
  const [inView, setInView]   = useState(false)
  const [model, setModel]     = useState(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}survival_model.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setModel(d) })
      .catch(() => {})
  }, [])

  const closurePct = model ? `${Math.round(model.meta.closure_rate * 100)}%` : '33%'

  const fade = (delay = 0) => ({
    opacity:    inView ? 1 : 0,
    transform:  inView ? 'none' : 'translateY(20px)',
    transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
  })

  return (
    <section id="finale" className="fn" ref={sectionRef}>

      {/* Opening statement */}
      <div className="fn-hero" style={fade(0)}>
        <div className="fn-hero-eyebrow">Key Takeaways</div>
        <h2 className="fn-hero-headline">
          Success is not driven by a single star.<br />
          <em>It emerges from a system of signals.</em>
        </h2>
        <p className="fn-hero-sub">
          {closurePct} of restaurants in our dataset closed permanently.
          Our analysis of 18,244 PA &amp; NJ restaurants reveals which signals
          actually separate survivors from closures — and what small business owners can do about it.
        </p>
      </div>

      {/* Takeaway cards */}
      <div className="fn-cards-wrap">
        <div className="fn-cards">
          {TAKEAWAYS.map((t, i) => (
            <TakeawayCard key={t.heading} {...t} index={i} inView={inView} />
          ))}
        </div>
      </div>

      {/* Closing quote */}
      <div className="fn-quote" style={fade(500)}>
        <div className="fn-quote-bar" />
        <blockquote>
          Independent restaurants without the safety net of a franchise system face an uphill battle.
          But the data shows a path: stay visible, accumulate feedback, and meet customers where they are.
        </blockquote>
        <div className="fn-quote-bar" />
      </div>

      {/* Methodology + Credits */}
      <div className="fn-meta" style={fade(600)}>
        <div className="fn-meta-col">
          <div className="fn-meta-label">Methodology</div>
          <p className="fn-meta-body">
            Analysis conducted on the Yelp Open Academic Dataset, filtered to
            Pennsylvania and New Jersey food-service businesses. Survival
            modeled using L2-regularized logistic regression (<code>is_open</code>
            as binary target) with standardized features: star rating, log
            review count, log check-in count, price tier, 9 amenity flags, and
            density class. Distinctive review language scored using
            log-likelihood ratio (G²). Franchise chains excluded via name matching.
          </p>
        </div>
        <div className="fn-meta-col">
          <div className="fn-meta-label">Data sources</div>
          <p className="fn-meta-body">
            Yelp Open Dataset (academic use) · PA &amp; NJ subset<br />
            Auguste Escoffier School of Culinary Arts (2025).<br />
            <em>Why nearly half of new restaurants fail.</em><br /><br />
            Luca, M. (2016). <em>Reviews, Reputation, and Revenue.</em><br />
            HBS Working Paper 12-016.
          </p>
          <div className="fn-meta-label" style={{ marginTop: 20 }}>Project</div>
          <p className="fn-meta-body">
            Information Visualization final project · UC Berkeley<br />
            Mabel · Jenna · Monica
          </p>
        </div>
      </div>

    </section>
  )
}
