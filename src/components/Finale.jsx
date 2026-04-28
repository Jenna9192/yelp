import { useRef, useState, useEffect } from 'react'
import './Finale.css'

const FINDINGS = [
  {
    stat: '40%',
    color: '#d32323',
    heading: 'Better survival in the sweet spot',
    body: 'Restaurants rated 4.0–4.5 ★ outlast both struggling low-rated venues and over-hyped 4.8+ ★ newcomers.',
  },
  {
    stat: '+0.34★',
    color: '#e07b39',
    heading: 'Outdoor seating lifts ratings',
    body: 'The single highest-impact amenity on star rating — ahead of free WiFi (+0.28) and reservations (+0.26).',
  },
  {
    stat: '32%',
    color: '#4e9e6e',
    heading: 'Of our dataset closed permanently',
    body: '6,517 of 20,317 PA & NJ restaurants never reopened — clustered in high-competition urban corridors.',
  },
  {
    stat: '0',
    color: '#5b8dd9',
    heading: 'Overlap in review language',
    body: '"Minutes," "told," and "manager" dominate 1–2 ★ reviews. "Amazing," "fresh," and "flavor" define 4.5–5 ★.',
  },
]

function FindingCard({ stat, color, heading, body, index }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold: 0.2 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`finale-finding ${inView ? 'finale-finding--in' : ''}`}
      style={{ '--delay': `${index * 100}ms`, '--color': color }}
    >
      <div className="finale-finding-stat">{stat}</div>
      <div className="finale-finding-heading">{heading}</div>
      <p className="finale-finding-body">{body}</p>
    </div>
  )
}

export default function Finale() {
  const quoteRef = useRef(null)
  const [quoteIn, setQuoteIn] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setQuoteIn(true); obs.disconnect() } },
      { threshold: 0.25 }
    )
    if (quoteRef.current) obs.observe(quoteRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="finale" className="finale">

      {/* Closing quote */}
      <div className="finale-quote-wrap" ref={quoteRef}>
        <div className={`finale-quote ${quoteIn ? 'finale-quote--in' : ''}`}>
          <div className="finale-quote-rule" />
          <blockquote className="finale-quote-text">
            Success is not driven by a single star.
            <br />
            <em>It emerges from a system of signals.</em>
          </blockquote>
          <div className="finale-quote-rule" />
        </div>
      </div>

      {/* Key findings */}
      <div className="finale-findings-wrap">
        <div className="finale-findings-label">Key findings</div>
        <div className="finale-findings">
          {FINDINGS.map((f, i) => <FindingCard key={f.heading} {...f} index={i} />)}
        </div>
      </div>

      {/* Divider */}
      <div className="finale-divider" />

      {/* Methodology + Credits */}
      <div className="finale-meta">
        <div className="finale-meta-col">
          <div className="finale-meta-label">Methodology</div>
          <p className="finale-meta-body">
            Analysis conducted on the Yelp Open Academic Dataset, filtered to
            Pennsylvania and New Jersey food-service businesses. Distinctive
            review language scored using log-likelihood ratio (G²). Survival
            defined as businesses with <code>is_open = 1</code> in the dataset.
            Amenity associations computed as mean rating/check-in difference
            between businesses with and without each attribute.
          </p>
        </div>
        <div className="finale-meta-col">
          <div className="finale-meta-label">Data sources</div>
          <p className="finale-meta-body">
            Yelp Open Dataset (academic use) · PA &amp; NJ subset<br />
            Auguste Escoffier School of Culinary Arts (2025).<br />
            <em>Why nearly half of new restaurants fail.</em>
          </p>
          <div className="finale-meta-label" style={{ marginTop: 20 }}>Project</div>
          <p className="finale-meta-body">
            Information Visualization final project · UC Berkeley<br />
            Mabel · Jenna · Monica
          </p>
        </div>
      </div>

    </section>
  )
}
