import { useRef, useState, useEffect } from 'react'
import './IntroSection.css'

const GLOBAL_STATS = [
  { value: '56K',   label: 'restaurants' },
  { value: '4.8M',  label: 'reviews' },
  { value: '10.1M', label: 'check-ins' },
]

const PANJ_STATS = [
  { value: '20,317', label: 'restaurants' },
  { value: '1.4M',   label: 'reviews' },
  { value: '2.4M',   label: 'check-ins' },
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
            61% of restaurants fail within 3 years.<sup style={{ fontSize: '0.45em', verticalAlign: 'super', color: '#d32323', fontWeight: 700 }}>¹</sup>
          </h2>

          <p
            className="intro-body"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(16px)', transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 130ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 130ms' }}
          >
            The restaurant industry is brutally competitive — yet some places thrive for decades
            while nearly identical neighbours close within months. Using the Yelp Academic Dataset,
            we mapped the signals that predict success across Pennsylvania and New Jersey.
          </p>

          {/* Dataset overview row */}
          <div
            className="intro-dataset-row"
            style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(14px)', transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 200ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) 200ms' }}
          >
            <div className="intro-dataset-col">
              <div className="intro-stat-group-label">Yelp Open Dataset</div>
              <div className="intro-stats">
                {GLOBAL_STATS.map(({ value, label }) => (
                  <div key={value} className="intro-stat-chip intro-stat-chip--global">
                    <span className="intro-stat-value">{value}</span>
                    <span className="intro-stat-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="intro-dataset-divider" />
            <div className="intro-dataset-col">
              <div className="intro-stat-group-label" style={{ color: '#d32323' }}>Our Study — PA &amp; NJ</div>
              <div className="intro-stats">
                {PANJ_STATS.map(({ value, label }) => (
                  <div key={value} className="intro-stat-chip">
                    <span className="intro-stat-value">{value}</span>
                    <span className="intro-stat-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="intro-sources"
            style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1) 290ms' }}
          >
            <p className="intro-source">
              ¹ Auguste Escoffier School of Culinary Arts (2025). <em>Why nearly half of new restaurants fail.</em>{' '}
              <a href="https://www.escoffier.edu/blog/food-entrepreneurship/restaurant-failure-analysis/" target="_blank" rel="noreferrer">escoffier.edu</a>
            </p>
            <p className="intro-source">
              ² Yelp Open Dataset (academic use) · PA &amp; NJ subset
            </p>
          </div>
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
