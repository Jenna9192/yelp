import { useEffect, useState } from 'react'
import { useInView } from '../hooks/useInView'
import './Hero.css'

export default function Hero() {
  const [sectionRef, inView] = useInView({ threshold: 0.05 })
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToNext = () => {
    const el = document.getElementById('intro')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="home"
      className="hero"
      ref={sectionRef}
      style={{ '--scroll-fade': Math.max(0, 1 - scrollY / 500) }}
    >
      <div className="hero-bg">
        <div className="hero-glow" style={{ transform: `translate(-50%, calc(-55% + ${scrollY * 0.18}px))` }} />
        <div className="hero-grid"  style={{ transform: `translateY(${scrollY * 0.28}px)` }} />
      </div>

      <div className="hero-content">

        {/* Left: narrative */}
        <div className="hero-left">
          <div className={`hero-eyebrow reveal${inView ? ' in-view' : ''}`} style={{ '--reveal-delay': '0ms' }}>
            <span className="hero-star">★</span> Yelp Academic Dataset Study
          </div>

          <h1 className={`hero-title reveal${inView ? ' in-view' : ''}`} style={{ '--reveal-delay': '80ms' }}>
            What makes a<br />restaurant<br />
            <span className="hero-title-accent">stand out?</span>
          </h1>

          <p className={`hero-desc reveal${inView ? ' in-view' : ''}`} style={{ '--reveal-delay': '180ms' }}>
            We dug into 20,317 restaurants across Pennsylvania &amp; New Jersey —
            their ratings, amenities, check-ins, and the language guests use —
            to find the signals that separate long-term favorites from restaurants that close.
          </p>

          <button
            className={`hero-cta reveal${inView ? ' in-view' : ''}`}
            style={{ '--reveal-delay': '280ms' }}
            onClick={scrollToNext}
          >
            Explore the study
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>

        {/* Right: stat card */}
        <div className={`hero-right reveal${inView ? ' in-view' : ''}`} style={{ '--reveal-delay': '200ms' }}>
          <div className="hero-stat-card">
            <div className="hero-stat-card-top">
              <span className="hero-stat-card-label">In our dataset</span>
            </div>
            <div className="hero-big-frac">1<span className="hero-frac-divider">/</span>3</div>
            <p className="hero-stat-card-body">
              restaurants closed<br />permanently.
            </p>
            <div className="hero-stat-card-divider" />
            <p className="hero-stat-card-sub">
              6,517 of 20,317 PA &amp; NJ restaurants on Yelp never reopened.
              What did the survivors do differently?
            </p>
          </div>
        </div>

      </div>

      <div className="hero-scroll-hint" onClick={scrollToNext}>
        <span>Scroll</span>
        <div className="hero-scroll-line" />
      </div>
    </section>
  )
}
