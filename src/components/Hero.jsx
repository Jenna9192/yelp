import { useEffect, useRef, useState } from 'react'
import { useInView } from '../hooks/useInView'
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
  const [sectionRef, inView] = useInView({ threshold: 0.05 })
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    <section
      id="home"
      className="hero"
      ref={sectionRef}
      style={{ '--scroll-fade': Math.max(0, 1 - scrollY / 500) }}
    >
      {/* Background decoration — parallax on scroll */}
      <div className="hero-bg">
        <div
          className="hero-glow"
          style={{ transform: `translate(-50%, calc(-55% + ${scrollY * 0.18}px))` }}
        />
        <div
          className="hero-grid"
          style={{ transform: `translateY(${scrollY * 0.28}px)` }}
        />
      </div>

      <div className="hero-content">
        {/* Eyebrow */}
        <div className={`hero-eyebrow reveal${inView ? ' in-view' : ''}`} style={{ '--reveal-delay': '0ms' }}>
          <span className="hero-star">★</span>
          Yelp Academic Dataset Study
        </div>

        {/* Headline */}
        <h1 className={`hero-title reveal${inView ? ' in-view' : ''}`} style={{ '--reveal-delay': '100ms' }}>
          What makes a restaurant<br />
          <span className="hero-title-accent">stand out?</span>
        </h1>

        {/* Description */}
        <p className={`hero-desc reveal${inView ? ' in-view' : ''}`} style={{ '--reveal-delay': '200ms' }}>
          An interactive analysis of ratings, reviews, check-ins, amenities,
          and review language across restaurants in Pennsylvania &amp; New Jersey
          from the Yelp Academic Dataset — exploring what separates thriving
          restaurants from the rest.
        </p>

        {/* Stats */}
        <div className="hero-stats">
          {stats.map(({ val, label, suffix }, i) => (
            <div
              key={label}
              className={`hero-stat reveal-scale${inView ? ' in-view' : ''}`}
              style={{ '--reveal-delay': `${300 + i * 70}ms` }}
            >
              <div className="hero-stat-val">
                <CountUp target={val} suffix={suffix} />
              </div>
              <div className="hero-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Rating legend preview */}
        <div className={`hero-rating-preview reveal${inView ? ' in-view' : ''}`} style={{ '--reveal-delay': '580ms' }}>
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
        <button
          className={`hero-cta reveal${inView ? ' in-view' : ''}`}
          style={{ '--reveal-delay': '680ms' }}
          onClick={scrollToMap}
        >
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
