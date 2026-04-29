import { useState, useEffect } from 'react'
import './Nav.css'

const SECTIONS = [
  { id: 'home',             label: 'Overview' },
  { id: 'context',          label: 'The Challenge' },
  { id: 'overview',         label: 'Dataset' },
  { id: 'map-section',      label: 'Map' },
  { id: 'cuisine',          label: 'Cuisine' },
  { id: 'sweet-spot',       label: 'Sweet Spot' },
  { id: 'survival-factors', label: 'Survival' },
  { id: 'amenities',        label: 'Amenities' },
  { id: 'reviews',          label: 'Reviews' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active,   setActive]   = useState('home')

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10)
      let current = 'home'
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id)
        if (el && window.scrollY >= el.offsetTop - 80) current = id
      }
      setActive(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <button className="nav-logo" onClick={() => scrollTo('home')}>
        <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 2v7c0 1.1.9 2 2 2 1.1 0 2-.9 2-2V2"/>
          <line x1="5" y1="11" x2="5" y2="22"/>
          <line x1="18" y1="2" x2="18" y2="22"/>
          <path d="M15 7.5C15 4.5 17 2 18 2s3 2.5 3 5.5a2.5 2.5 0 0 1-2.5 2.5h-1A2.5 2.5 0 0 1 15 7.5z"/>
        </svg>
        <span className="nav-logo-yelp">yelp</span>
        <span className="nav-logo-badge">Academic Dataset</span>
      </button>

      <div className="nav-links">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            className={`nav-link ${active === id ? 'active' : ''}`}
            onClick={() => scrollTo(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
