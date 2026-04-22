import { useRef, useState, useEffect } from 'react'
import './IntroSection.css'

const STATS = [
  { value: '67K',  label: 'restaurants in PA & NJ' },
  { value: '7.0M', label: 'reviews analysed' },
  { value: '131K', label: 'check-in events' },
]

const QUESTIONS = [
  { num: '02', q: 'Where do successful restaurants cluster?',       hint: 'Mapped across PA & NJ by rating and status' },
  { num: '03', q: 'What\'s the rating sweet spot for longevity?',   hint: 'Reviews vs. stars — where survival peaks' },
  { num: '04', q: 'Which amenities actually move the needle?',      hint: 'Twelve extras scored on ratings and foot traffic' },
  { num: '05', q: 'What fingerprint do thriving restaurants share?', hint: 'Multi-dimensional profiles across success archetypes' },
]

export default function IntroSection() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold: 0.12 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="intro" className="intro-section" ref={ref}>
      <div className="intro-grid">

        {/* ── Left: the challenge ── */}
        <div className="intro-left">
          <div
            className="intro-eyebrow"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(16px)', transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)' }}
          >
            01 — The Challenge
          </div>

          <h2
            className="intro-headline"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(20px)', transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1) 60ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) 60ms' }}
          >
            61% of restaurants fail within 3 years.
          </h2>

          <p
            className="intro-body"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(16px)', transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 130ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 130ms' }}
          >
            The restaurant industry is brutally competitive. Yet some places thrive for decades
            while nearly identical neighbours close within months. What separates them?
          </p>
          <p
            className="intro-body"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(16px)', transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 180ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 180ms' }}
          >
            Using the Yelp Academic Dataset — covering Pennsylvania and New Jersey — we mapped
            the signals that predict success: location, ratings, review volume, amenities, and
            the language guests use when they love a place.
          </p>

          {/* Stat chips */}
          <div
            className="intro-stats"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(14px)', transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 240ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 240ms' }}
          >
            {STATS.map(({ value, label }) => (
              <div key={value} className="intro-stat-chip">
                <span className="intro-stat-value">{value}</span>
                <span className="intro-stat-label">{label}</span>
              </div>
            ))}
          </div>

          <p
            className="intro-source"
            style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1) 320ms' }}
          >
            Source: Yelp Open Dataset (academic use) · PA &amp; NJ subset
          </p>
        </div>

        {/* ── Right: four questions ── */}
        <div className="intro-right">
          <div
            className="intro-q-label"
            style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1) 100ms' }}
          >
            Four questions this study answers
          </div>

          <div className="intro-questions">
            {QUESTIONS.map(({ num, q, hint }, i) => (
              <div
                key={num}
                className="intro-q-card"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'none' : 'translateY(18px)',
                  transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${200 + i * 80}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${200 + i * 80}ms`,
                }}
              >
                <span className="intro-q-num">{num}</span>
                <div className="intro-q-text">
                  <span className="intro-q-question">{q}</span>
                  <span className="intro-q-hint">{hint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
