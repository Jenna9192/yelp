import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import './Hero.css'

const LAT_MIN = 24.5, LAT_MAX = 50.0
const LNG_MIN = -126.0, LNG_MAX = -65.5

function project(lat, lng, W, H) {
  return [
    ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W,
    ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H,
  ]
}

function drawGeoJSON(ctx, features, W, H, fillColor, strokeColor) {
  ctx.fillStyle   = fillColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth   = 0.5
  for (const f of features) {
    const { type, coordinates } = f.geometry
    const polys = type === 'Polygon' ? [coordinates]
                : type === 'MultiPolygon' ? coordinates : []
    for (const poly of polys) {
      for (const ring of poly) {
        ctx.beginPath()
        ring.forEach(([lng, lat], i) => {
          const [x, y] = project(lat, lng, W, H)
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
  }
}

const PANJ = new Set(['PA', 'NJ'])

export default function Hero() {
  const canvasRef   = useRef(null)
  const rafRef      = useRef(null)
  const citiesRef   = useRef([])
  const statesRef   = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}us_overview.json`).then(r => r.json()),
      fetch(`${import.meta.env.BASE_URL}us_states.json`).then(r => r.json()),
    ]).then(([overview, states]) => {
      citiesRef.current = (overview.top_cities || []).filter(c => c.lat && c.lng)
      statesRef.current = states
      setReady(true)
    }).catch(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function render(progress = 1) {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      // Parchment background to match menu aesthetic
      ctx.fillStyle = '#e8e0d4'
      ctx.fillRect(0, 0, W, H)

      if (statesRef.current) {
        drawGeoJSON(ctx, statesRef.current.features, W, H, '#f0e9dc', '#c8bfb0')
        const panjFeatures = statesRef.current.features.filter(
          f => ['Pennsylvania','New Jersey'].includes(f.properties?.name)
        )
        // PA/NJ: warm tint so they read as distinct
        drawGeoJSON(ctx, panjFeatures, W, H, '#ecddd0', '#c4a898')
      }

      // ── Soft gaussian blobs — clearly localized, not blurry ────────────────
      const cities = [...citiesRef.current]
        .filter(c => c.lat && c.lng)
        .sort((a, b) => a.n - b.n)   // smallest first so big cities draw on top

      const maxN = Math.max(...cities.map(c => c.n), 1)
      // 9% of smaller dimension — readable size, soft edge, not a fog
      const maxR = Math.min(W, H) * 0.09

      cities.forEach(city => {
        const [x, y] = project(city.lat, city.lng, W, H)
        const scale  = Math.log(city.n + 1) / Math.log(maxN + 1)
        const r      = scale * maxR * progress
        const isPaNj = PANJ.has(city.state)

        // Each blob: opaque saturated core fading to fully transparent edge
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        if (isPaNj) {
          g.addColorStop(0,    `rgba(211,35,35,${0.80 * progress})`)
          g.addColorStop(0.35, `rgba(211,35,35,${0.50 * progress})`)
          g.addColorStop(0.65, `rgba(211,35,35,${0.18 * progress})`)
          g.addColorStop(1,    'rgba(211,35,35,0)')
        } else {
          g.addColorStop(0,    `rgba(211,35,35,${0.50 * progress})`)
          g.addColorStop(0.40, `rgba(211,35,35,${0.20 * progress})`)
          g.addColorStop(0.75, `rgba(211,35,35,${0.05 * progress})`)
          g.addColorStop(1,    'rgba(211,35,35,0)')
        }

        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
      })
    }

    function resize() {
      const dpr = devicePixelRatio || 1
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      render(1)
    }

    // Animate bubbles in
    let start = null
    const DURATION = 1400
    function animate(ts) {
      if (!start) start = ts
      const t = Math.min((ts - start) / DURATION, 1)
      render(1 - Math.pow(1 - t, 3))
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [ready])

  const scrollToNext = () =>
    document.getElementById('context')?.scrollIntoView({ behavior: 'smooth' })

  const ease = [0.16, 1, 0.3, 1]

  return (
    <section id="home" className="hero">
      <div className="hero-top-rule" />

      <div className="hero-layout">

        {/* ── Left: text ── */}
        <div className="hero-left">
          <div className="hero-corner hero-corner--tl" aria-hidden="true" />
          <div className="hero-corner hero-corner--br" aria-hidden="true" />
          <div className="hero-watermark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2 1.1 0 2-.9 2-2V2"/>
              <line x1="5" y1="11" x2="5" y2="22"/>
              <line x1="18" y1="2" x2="18" y2="22"/>
              <path d="M15 7.5C15 4.5 17 2 18 2s3 2.5 3 5.5a2.5 2.5 0 0 1-2.5 2.5h-1A2.5 2.5 0 0 1 15 7.5z"/>
            </svg>
          </div>
          <motion.div className="hero-eyebrow"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}>
            <span className="hero-eyebrow-line" />
            Yelp Academic Dataset
          </motion.div>

          <motion.h1 className="hero-title"
            initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.9, ease }}>
            Beyond<br />the Stars
          </motion.h1>

          <motion.p className="hero-sub"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}>
            What makes a restaurant survive in America's most competitive markets?
            A data story across 1.4&nbsp;million reviews.
          </motion.p>

          <motion.div className="hero-stat-row"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.7, ease }}>
            {[
              { val: '18,244', lbl: 'PA & NJ restaurants' },
              { val: '1.4M',   lbl: 'Reviews' },
              { val: '33.5%',  lbl: 'Closure rate' },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="hero-chip">
                <span className="hero-chip-val">{val}</span>
                <span className="hero-chip-lbl">{lbl}</span>
              </div>
            ))}
          </motion.div>

          <motion.button className="hero-cta" onClick={scrollToNext}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.7, duration: 0.6 }}>
            Begin the story
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </motion.button>
        </div>

        {/* ── Right: US bubble map ── */}
        <motion.div className="hero-right"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1.0 }}>

          <div className="hero-map-card">
            <canvas ref={canvasRef} className="hero-canvas" />

            {/* Map label */}
            <div className="hero-map-title">
              Yelp dataset coverage — US independent restaurants
            </div>

            {/* Legend */}
            <div className="hero-map-legend">
              <span className="hero-legend-item">
                <span className="hero-legend-dot hero-legend-dot--bright" />
                PA &amp; NJ <em>(our focus)</em>
              </span>
              <span className="hero-legend-item">
                <span className="hero-legend-dot hero-legend-dot--dim" />
                Other cities
              </span>
              <span className="hero-legend-note">Bubble = restaurant count</span>
            </div>
          </div>

        </motion.div>
      </div>

      <button className="hero-scroll-cue" onClick={scrollToNext}>
        <span>Scroll</span>
        <div className="hero-scroll-line" />
      </button>
    </section>
  )
}
