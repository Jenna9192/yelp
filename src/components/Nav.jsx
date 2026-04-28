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
        <span className="nav-logo-burst">★</span>
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
