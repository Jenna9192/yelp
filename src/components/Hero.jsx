import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './Hero.css'

// PA/NJ restaurant clusters — pre-baked, module-level so they never regenerate
const CLUSTERS = [
  { lat: 39.95, lng: -75.17, w: 28, r: 0.30 }, // Philadelphia
  { lat: 40.44, lng: -79.99, w: 13, r: 0.22 }, // Pittsburgh
  { lat: 40.73, lng: -74.17, w: 16, r: 0.28 }, // Newark / NJ metro
  { lat: 40.60, lng: -75.49, w:  5, r: 0.18 }, // Allentown
  { lat: 40.27, lng: -76.88, w:  4, r: 0.18 }, // Harrisburg
  { lat: 40.22, lng: -74.76, w:  4, r: 0.20 }, // Trenton
  { lat: 40.92, lng: -74.06, w:  6, r: 0.20 }, // North Jersey
  { lat: 39.36, lng: -74.43, w:  3, r: 0.18 }, // Atlantic City
  { lat: 40.06, lng: -74.10, w:  4, r: 0.22 }, // South Jersey shore
  { lat: 41.40, lng: -75.67, w:  3, r: 0.15 }, // Scranton
  { lat: 40.33, lng: -78.92, w:  3, r: 0.15 }, // Altoona
  { lat: 40.5,  lng: -77.8,  w:  5, r: 0.90 }, // rural PA scatter
  { lat: 40.3,  lng: -74.5,  w:  4, r: 0.55 }, // central NJ scatter
]

function buildDots(total = 2000) {
  const totalW = CLUSTERS.reduce((s, c) => s + c.w, 0)
  const dots = []
  for (const c of CLUSTERS) {
    const n = Math.round((c.w / totalW) * total)
    for (let i = 0; i < n; i++) {
      const u1 = Math.random() || 1e-10
      const r = Math.sqrt(-2 * Math.log(u1)) * c.r * 0.65
      const θ = Math.random() * Math.PI * 2
      dots.push({
        lat:    c.lat + r * Math.cos(θ),
        lng:    c.lng + r * Math.sin(θ) * 1.4,
        open:   Math.random() > 0.32,
        size:   1.5 + Math.random() * 1.8,
        alpha:  0.4 + Math.random() * 0.5,
      })
    }
  }
  return dots.sort(() => Math.random() - 0.5)
}

const DOTS = buildDots(2000)

const LAT_MIN = 38.6, LAT_MAX = 42.6
const LNG_MIN = -80.8, LNG_MAX = -73.6

function project(lat, lng, w, h) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * w
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * h
  return [x, y]
}

export default function Hero() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let revealed = 0
    let startTime = null
    const DURATION = 4200

    function resize() {
      const dpr = devicePixelRatio || 1
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Re-draw already revealed dots after resize
      revealed = 0
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      startTime = null
    }
    resize()
    window.addEventListener('resize', resize)

    function draw(ts) {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / DURATION, 1)
      const target   = Math.floor(progress * DOTS.length)

      if (target > revealed) {
        const W = canvas.offsetWidth, H = canvas.offsetHeight
        for (let i = revealed; i < target; i++) {
          const d = DOTS[i]
          const [x, y] = project(d.lat, d.lng, W, H)
          if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue
          ctx.beginPath()
          ctx.arc(x, y, d.size, 0, Math.PI * 2)
          ctx.fillStyle = d.open
            ? `rgba(211,35,35,${d.alpha})`
            : `rgba(180,176,168,${d.alpha * 0.5})`
          ctx.fill()
        }
        revealed = target
      }
      if (progress < 1) rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const scrollToNext = () =>
    document.getElementById('intro')?.scrollIntoView({ behavior: 'smooth' })

  const ease = [0.16, 1, 0.3, 1]

  return (
    <section id="home" className="hero">

      {/* Animated dot map */}
      <canvas ref={canvasRef} className="hero-canvas" />

      {/* Vignette overlays */}
      <div className="hero-vignette" />
      <div className="hero-bottom-fade" />

      {/* Red top rule */}
      <div className="hero-top-rule" />

      {/* Main content */}
      <div className="hero-content">

        {/* Legend + scope */}
        <motion.div className="hero-scope"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}>
          <span className="hero-legend-item">
            <span className="hero-legend-dot hero-legend-dot--red" />open
          </span>
          <span className="hero-legend-item">
            <span className="hero-legend-dot hero-legend-dot--grey" />closed
          </span>
          <span className="hero-scope-sep">·</span>
          20,317 restaurants · Pennsylvania &amp; New Jersey
        </motion.div>

        {/* Display headline */}
        <motion.h1 className="hero-title"
          initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 1.1, ease }}>
          Beyond<br />the Stars
        </motion.h1>

        <motion.p className="hero-sub"
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.9, ease }}>
          What actually makes restaurants stand out<br className="hero-br" />
          in crowded food markets?
        </motion.p>

        <motion.p className="hero-body"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.9, duration: 0.9 }}>
          A data story across 1.4 million reviews — mapping the signals that
          separate long-term favorites from the ones that quietly disappear.
        </motion.p>

        <motion.button className="hero-cta" onClick={scrollToNext}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.7 }}>
          Begin the story
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </motion.button>
      </div>

      {/* Bottom stats bar */}
      <motion.div className="hero-stats"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.9, duration: 0.8 }}>
        {[
          { val: '20,317', label: 'Restaurants' },
          { val: '1.4M',   label: 'Reviews' },
          { val: '2.4M',   label: 'Check-ins' },
          { val: '6,517',  label: 'Permanent closures' },
        ].map(({ val, label }) => (
          <div key={label} className="hero-stat">
            <span className="hero-stat-val">{val}</span>
            <span className="hero-stat-lbl">{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Scroll cue */}
      <motion.button className="hero-scroll-cue" onClick={scrollToNext}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 3.4, duration: 0.8 }}>
        <span>Scroll</span>
        <div className="hero-scroll-line" />
      </motion.button>

    </section>
  )
}
