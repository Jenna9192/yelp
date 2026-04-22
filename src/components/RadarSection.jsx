import { useEffect, useRef, useState, useCallback } from 'react'
import { useInView } from '../hooks/useInView'
import './RadarSection.css'

// ── Drawing progress hook ──────────────────────────────────────────────────────
// Drives a 0→1 value via RAF with ease-out-back (slight overshoot) when the
// target element enters the viewport.
function useDrawProgress(duration = 1300) {
  const ref    = useRef(null)
  const rafRef = useRef(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        const start = performance.now()
        const tick  = (now) => {
          const t = Math.min((now - start) / duration, 1)
          // ease-out-back — springy overshoot
          const c1 = 1.70158, c3 = c1 + 1
          const ease = t === 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
          setProgress(Math.max(0, ease))
          if (t < 1) rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      },
      { threshold: 0.25 }
    )
    obs.observe(el)
    return () => { obs.disconnect(); cancelAnimationFrame(rafRef.current) }
  }, [duration])

  return [ref, progress]
}

// ── Radar math ─────────────────────────────────────────────────────────────────
const toXY = (cx, cy, r, angleDeg) => {
  const a = (angleDeg - 90) * (Math.PI / 180)
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function buildPoints(axes, values, cx, cy, r, progress) {
  return axes.map((axis, i) => {
    const angle = (i / axes.length) * 360
    const val   = (values[axis.key] ?? 0) * Math.min(progress, 1) // cap at 1 for fills
    return toXY(cx, cy, r * val, angle)
  })
}

// ── SVG radar chart ────────────────────────────────────────────────────────────
function RadarChart({ axes, profiles, progress, size = 300, highlighted, onPointHover, onPointLeave }) {
  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.35

  const ringPoints = (scale) =>
    axes.map((_, i) => {
      const [x, y] = toXY(cx, cy, r * scale, (i / axes.length) * 360)
      return `${x},${y}`
    }).join(' ')

  const labelOpacity  = Math.max(0, Math.min(1, (progress - 0.55) * 2.5))
  const dotScale      = Math.max(0, Math.min(1, (progress - 0.7) * 3.5))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Background rings */}
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <polygon
          key={scale}
          points={ringPoints(scale)}
          fill={scale === 1 ? 'rgba(211,35,35,0.025)' : 'none'}
          stroke={scale === 1 ? '#D3D1C7' : '#E8E6DF'}
          strokeWidth={scale === 1 ? 1.5 : 1}
          strokeDasharray={scale < 1 ? '3 4' : undefined}
        />
      ))}

      {/* Ring % labels */}
      {[0.5, 1].map(scale => {
        const [lx, ly] = toXY(cx, cy, r * scale, 0)
        return (
          <text
            key={scale}
            x={lx + 4} y={ly - 4}
            fontSize="9" fill="#C4C0B8" textAnchor="start"
            opacity={Math.max(0, (progress - 0.7) * 3)}
          >
            {scale * 100}%
          </text>
        )
      })}

      {/* Axis spokes */}
      {axes.map((_, i) => {
        const [x2, y2] = toXY(cx, cy, r, (i / axes.length) * 360)
        return (
          <line key={i} x1={cx} y1={cy} x2={x2} y2={y2}
            stroke="#E8E6DF" strokeWidth="1" />
        )
      })}

      {/* Profiles — dim non-highlighted */}
      {profiles.map(({ name, color, values }) => {
        const pts      = buildPoints(axes, values, cx, cy, r, progress)
        const ptsStr   = pts.map(([x, y]) => `${x},${y}`).join(' ')
        const isActive = highlighted === null || highlighted === name
        const isFocus  = highlighted === name

        return (
          <g key={name} opacity={isActive ? 1 : 0.18} style={{ transition: 'opacity 0.25s' }}>
            <polygon
              points={ptsStr}
              fill={color}
              fillOpacity={isFocus ? 0.22 : 0.10}
              stroke={color}
              strokeWidth={isFocus ? 2.5 : 1.5}
              style={{
                filter: isFocus ? `drop-shadow(0 0 8px ${color}66)` : 'none',
                transition: 'filter 0.2s, stroke-width 0.2s, fill-opacity 0.2s',
              }}
            />
            {pts.map(([x, y], ai) => (
              <circle
                key={ai}
                cx={x} cy={y}
                r={(isFocus ? 5 : 3.5) * dotScale}
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                style={{ cursor: 'crosshair', transition: 'r 0.2s' }}
                onMouseEnter={(e) => onPointHover?.(e, name, color, axes[ai].label, values[axes[ai].key])}
                onMouseLeave={() => onPointLeave?.()}
              />
            ))}
          </g>
        )
      })}

      {/* Axis labels — fade in late */}
      {axes.map((axis, i) => {
        const a          = (i / axes.length) * 360
        const [lx, ly]   = toXY(cx, cy, r + 26, a)
        const textAnchor = lx < cx - 8 ? 'end' : lx > cx + 8 ? 'start' : 'middle'
        return (
          <text
            key={i}
            x={lx} y={ly}
            fontSize="11.5" fontWeight="500" fill="#888780"
            textAnchor={textAnchor} dominantBaseline="middle"
            opacity={labelOpacity}
            style={{ userSelect: 'none' }}
          >
            {axis.label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────────
const AXES_A = [
  { key: 'rating',    label: 'Rating'    },
  { key: 'reviews',   label: 'Reviews'   },
  { key: 'traffic',   label: 'Traffic'   },
  { key: 'amenities', label: 'Amenities' },
  { key: 'sentiment', label: 'Sentiment' },
]

const PROFILES_A = [
  {
    name:   'Thriving Local',
    color:  '#22c55e',
    detail: 'Strong across every signal',
    values: { rating: 0.88, reviews: 0.74, traffic: 0.70, amenities: 0.63, sentiment: 0.90 },
  },
  {
    name:   'Hidden Gem',
    color:  '#3b82f6',
    detail: 'High quality, low discovery',
    values: { rating: 0.87, reviews: 0.26, traffic: 0.22, amenities: 0.38, sentiment: 0.83 },
  },
  {
    name:   'Crowd Favorite',
    color:  '#f59e0b',
    detail: 'High volume, average ratings',
    values: { rating: 0.58, reviews: 0.92, traffic: 0.88, amenities: 0.70, sentiment: 0.57 },
  },
  {
    name:   'At Risk',
    color:  '#ef4444',
    detail: 'Declining on all fronts',
    values: { rating: 0.34, reviews: 0.42, traffic: 0.28, amenities: 0.26, sentiment: 0.30 },
  },
]

const AXES_B = [
  { key: 'food',      label: 'Food'        },
  { key: 'service',   label: 'Service'     },
  { key: 'value',     label: 'Value'       },
  { key: 'atmosphere',label: 'Atmosphere'  },
  { key: 'breadth',   label: 'Meal Breadth'},
  { key: 'access',    label: 'Access'      },
]

const PROFILES_B = [
  {
    name:   'Fine Dining',
    color:  '#d32323',
    detail: 'Top food & ambiance, low value',
    values: { food: 0.93, service: 0.90, value: 0.36, atmosphere: 0.95, breadth: 0.46, access: 0.42 },
  },
  {
    name:   'Neighborhood Diner',
    color:  '#8b5cf6',
    detail: 'Balanced, reliable, accessible',
    values: { food: 0.74, service: 0.78, value: 0.85, atmosphere: 0.58, breadth: 0.92, access: 0.80 },
  },
  {
    name:   'Fast Casual',
    color:  '#f59e0b',
    detail: 'Efficient, affordable, wide reach',
    values: { food: 0.65, service: 0.54, value: 0.91, atmosphere: 0.38, breadth: 0.68, access: 0.94 },
  },
  {
    name:   'Bar & Grill',
    color:  '#0ea5e9',
    detail: 'Social & late-night friendly',
    values: { food: 0.60, service: 0.65, value: 0.68, atmosphere: 0.88, breadth: 0.52, access: 0.87 },
  },
]

// ── Radar card ─────────────────────────────────────────────────────────────────
function RadarCard({ letter, title, subtitle, axes, profiles, inViewParent }) {
  const [chartRef, progress]     = useDrawProgress(1300)
  const [headerRef, headerInView] = useInView({ threshold: 0.2 })
  const [highlighted, setHighlight] = useState(null)
  const [tooltip, setTooltip]       = useState(null)
  const svgWrapRef = useRef(null)

  const handlePointHover = useCallback((e, name, color, axisLabel, val) => {
    const rect = svgWrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x:     e.clientX - rect.left + 12,
      y:     e.clientY - rect.top  - 16,
      name, color, axisLabel,
      pct:   Math.round(val * 100),
    })
  }, [])

  const legendVisible = progress > 0.05

  return (
    <div className="rc-card">
      {/* Card header */}
      <div
        className={`rc-header reveal${headerInView ? ' in-view' : ''}`}
        ref={headerRef}
      >
        <span className="rc-letter">{letter}</span>
        <div>
          <h3 className="rc-title">{title}</h3>
          <p className="rc-subtitle">{subtitle}</p>
        </div>
      </div>

      {/* Chart + legend */}
      <div className="rc-body" ref={chartRef}>
        <div className="rc-svg-wrap" ref={svgWrapRef}>
          <RadarChart
            axes={axes}
            profiles={profiles}
            progress={progress}
            size={280}
            highlighted={highlighted}
            onPointHover={handlePointHover}
            onPointLeave={() => setTooltip(null)}
          />
          {tooltip && (
            <div className="rc-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
              <div className="rc-tooltip-name" style={{ color: tooltip.color }}>
                {tooltip.name}
              </div>
              <div className="rc-tooltip-val">
                {tooltip.axisLabel}: <strong>{tooltip.pct}%</strong>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <ul className="rc-legend">
          {profiles.map(({ name, color, detail }, i) => (
            <li
              key={name}
              className={`rc-legend-item${highlighted === name ? ' active' : ''}`}
              style={{
                opacity:   legendVisible ? 1 : 0,
                transform: legendVisible ? 'none' : 'translateX(-14px)',
                transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 85}ms,
                             transform 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 85}ms`,
              }}
              onMouseEnter={() => setHighlight(name)}
              onMouseLeave={() => setHighlight(null)}
            >
              <span className="rc-dot" style={{ background: color }} />
              <span className="rc-leg-text">
                <span className="rc-leg-name">{name}</span>
                <span className="rc-leg-detail">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Insight callout ────────────────────────────────────────────────────────────
function Insight({ color, stat, label, text, inView, delay }) {
  return (
    <div
      className="rs-insight"
      style={{
        borderTopColor: color,
        opacity:   inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(22px)',
        transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms,
                     transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      <div className="rs-insight-stat" style={{ color }}>{stat}</div>
      <div className="rs-insight-label">{label}</div>
      <p className="rs-insight-text">{text}</p>
    </div>
  )
}

// ── Section ────────────────────────────────────────────────────────────────────
export default function RadarSection() {
  const [sectionRef, inView] = useInView({ threshold: 0.05 })

  return (
    <section id="radar" className="radar-section" ref={sectionRef}>
      {/* Section header */}
      <div className={`rs-header reveal${inView ? ' in-view' : ''}`}>
        <div className="rs-eyebrow">05 — Restaurant Profiles</div>
        <h2 className="rs-title">What fingerprint do thriving restaurants share?</h2>
        <p className="rs-subtitle">
          Multi-dimensional fingerprints comparing success signals and dining experience across
          archetypes in the PA &amp; NJ dataset
        </p>
      </div>

      {/* Two radar charts */}
      <div className="rs-grid">
        <RadarCard
          letter="A"
          title="Success Profile"
          subtitle="How do thriving, hidden, and struggling restaurants differ across five key performance signals?"
          axes={AXES_A}
          profiles={PROFILES_A}
          inViewParent={inView}
        />
        <RadarCard
          letter="B"
          title="Dining Experience Profile"
          subtitle="How do fine dining, fast casual, bar & grill, and diners trade off across six experience dimensions?"
          axes={AXES_B}
          profiles={PROFILES_B}
          inViewParent={inView}
        />
      </div>

      {/* Insight callouts */}
      <div className="rs-insights">
        <Insight
          inView={inView} delay={350}
          color="#22c55e" stat="2.6×"
          label="sentiment advantage"
          text="Thriving locals have 2.6× better review sentiment than at-risk restaurants — despite only a 1.5× gap in star ratings."
        />
        <Insight
          inView={inView} delay={500}
          color="#3b82f6" stat="68%"
          label="of hidden gems"
          text="Hidden gems sit in the top 20% for rating but bottom 40% for review volume — invisible to Yelp's algorithm despite high quality."
        />
        <Insight
          inView={inView} delay={650}
          color="#d32323" stat="58 pts"
          label="value gap"
          text="Fine dining scores 58 pts lower on value than fast casual, yet outperforms by 57 pts on atmosphere — a clear trade-off signal."
        />
      </div>
    </section>
  )
}
