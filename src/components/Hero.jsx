import { useEffect, useRef, useState } from 'react'
import './Hero.css'

// Animated count-up number
function CountUp({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref  = useRef(null)
  const done = useRef(false)

  useEffect(() => {
    if (!target || done.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return
        done.current = true
        const start    = performance.now()
        const duration = 1400

        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1)
          // ease-out cubic
          const ease = 1 - Math.pow(1 - t, 3)
          setVal(Math.round(ease * target))
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

export default function Hero({ scope }) {
  const scrollToMap = () => {
    const el = document.getElementById('map-section')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const stats = scope
    ? [
        { val: scope.total,          label: 'Restaurants', suffix: '' },
        { val: scope.cities,         label: 'Cities',      suffix: '' },
        { val: 131930,               label: 'Check-ins',   suffix: '' },
        { val: 25,                   label: 'Cuisine types', suffix: '' },
      ]
    : [
        { val: 67827,  label: 'Restaurants',  suffix: '' },
        { val: 993,    label: 'Cities',        suffix: '' },
        { val: 131930, label: 'Check-ins',     suffix: '' },
        { val: 25,     label: 'Cuisine types', suffix: '' },
      ]

  return (
    <section id="home" className="hero">
      {/* Background decoration */}
      <div className="hero-bg">
        <div className="hero-glow" />
        <div className="hero-grid" />
      </div>

      <div className="hero-content">
        {/* Eyebrow */}
        <div className="hero-eyebrow">
          <span className="hero-star">★</span>
          Yelp Academic Dataset Study
        </div>

        {/* Headline */}
        <h1 className="hero-title">
          What makes a restaurant<br />
          <span className="hero-title-accent">stand out?</span>
        </h1>

        {/* Description */}
        <p className="hero-desc">
          An interactive analysis of ratings, reviews, check-ins, amenities,
          and review language across the complete Yelp Academic Dataset —
          exploring what separates thriving restaurants from the rest.
        </p>

        {/* Stats */}
        <div className="hero-stats">
          {stats.map(({ val, label, suffix }) => (
            <div key={label} className="hero-stat">
              <div className="hero-stat-val">
                <CountUp target={val} suffix={suffix} />
              </div>
              <div className="hero-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Rating legend preview */}
        <div className="hero-rating-preview">
          <span className="hrp-label">Dot color = rating</span>
          <div className="hrp-dots">
            {[
              ['#ef4444', '< 2★'],
              ['#fb923c', '3★'],
              ['#facc15', '3.5★'],
              ['#4ade80', '4★'],
              ['#22c55e', '4.5★+'],
            ].map(([color, label]) => (
              <div key={label} className="hrp-item">
                <span className="hrp-dot" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button className="hero-cta" onClick={scrollToMap}>
          Explore the Map
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      </div>

      {/* Scroll hint */}
      <div className="hero-scroll-hint" onClick={scrollToMap}>
        <span>Scroll</span>
        <div className="hero-scroll-line" />
      </div>
    </section>
  )
}
