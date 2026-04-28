import { useState, useEffect, useMemo, useRef } from 'react'
import './SweetSpotScatter.css'

// ── Constants ──────────────────────────────────────────────────────────────────
const YELP_RED    = '#d32323'
const PRICE_LABELS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

const ratingColor = (s) => {
  if (s >= 4.5) return '#22c55e'
  if (s >= 4.0) return '#4ade80'
  if (s >= 3.5) return '#facc15'
  if (s >= 3.0) return '#fb923c'
  if (s >= 2.0) return '#f87171'
  return '#ef4444'
}

// CSS class used to drive beat-based opacity transitions without React re-renders
const ratingClass = (s) => {
  if (s >= 5.0) return 'scat-5'
  if (s >= 4.5) return 'scat-45'
  if (s >= 4.0) return 'scat-4'
  if (s >= 3.5) return 'scat-35'
  if (s >= 3.0) return 'scat-3'
  return 'scat-low'
}

// ── Chart geometry ─────────────────────────────────────────────────────────────
const W = 640, H = 400
const PAD = { top: 72, right: 36, bottom: 52, left: 60 }
const X_VALS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]

const xScale = (stars) => {
  const i = X_VALS.indexOf(stars)
  if (i < 0) return PAD.left
  return PAD.left + (i / (X_VALS.length - 1)) * (W - PAD.left - PAD.right)
}

const yScale = (v) => {
  const c = Math.max(1, Math.min(2000, v || 1))
  const pct = Math.log10(c) / Math.log10(2000)
  return H - PAD.bottom - pct * (H - PAD.top - PAD.bottom)
}

const jitter = (name = '') => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return ((h % 1000) / 1000 - 0.5) * 28
}

// ── Story beats ────────────────────────────────────────────────────────────────
const BEATS = [
  {
    num: '01',
    headline: 'Rating vs. real-world traffic',
    body: 'Every dot is one restaurant — 18,244 businesses across PA & NJ. X axis shows Yelp star rating; Y axis (log scale) shows customer check-ins, a direct measure of how often people actually walk through the door.',
    stat: '18,244', statUnit: 'restaurants plotted', color: YELP_RED,
  },
  {
    num: '02',
    headline: 'The 4-star sweet spot',
    body: '4-star restaurants dominate check-ins. They\'re polished enough to earn loyalty and approachable enough to attract first-timers. The data is clear: excellence — not perfection — is what drives the most foot traffic.',
    stat: '4.0 ★', statUnit: 'highest avg check-ins', color: '#4ade80',
  },
  {
    num: '03',
    headline: 'The 5-star trap',
    body: 'Perfect ratings look impressive — but they almost always mean a tiny review sample. Most 5-star restaurants have far fewer check-ins than their 4-star peers. Chasing perfection means fewer visits, not more.',
    stat: '5.0 ★', statUnit: 'fewer visits than 4★', color: '#9ca3af',
  },
]

// ── Scatter SVG chart ──────────────────────────────────────────────────────────
// Beat class on the SVG drives opacity via CSS — no per-circle React re-renders
function ScatterChart({ points, beat, fourStar, fiveStar, totalShown, totalAll }) {
  const Y_TICKS = [1, 10, 100, 1000]

  return (
    <div className="ss-chart-wrap">
      <svg
        className={`ss-chart ss-b${beat}`}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y grid lines */}
        {Y_TICKS.map(t => (
          <g key={t}>
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={yScale(t)} y2={yScale(t)}
              stroke="#E8E6DF" strokeDasharray="3,4"
            />
            <text x={PAD.left - 8} y={yScale(t) + 4}
              textAnchor="end" fontSize="10" fill="#C4C0B8" fontFamily="inherit">
              {t >= 1000 ? '1k' : t}
            </text>
          </g>
        ))}

        {/* X axis ticks */}
        {X_VALS.map(v => (
          <text
            key={v}
            x={xScale(v)} y={H - PAD.bottom + 18}
            textAnchor="middle" fontSize="11" fontFamily="inherit"
            fill={v === 4.0 ? YELP_RED : '#C4C0B8'}
            fontWeight={v === 4.0 ? '700' : '400'}
          >
            {v.toFixed(1)}★
          </text>
        ))}

        {/* Axis labels */}
        <text x={(W + PAD.left) / 2} y={H - 8}
          textAnchor="middle" fontSize="11" fill="#888780" fontFamily="inherit">
          Star rating
        </text>
        <text
          x={14} y={(H + PAD.top) / 2}
          textAnchor="middle" fontSize="11" fill="#888780" fontFamily="inherit"
          transform={`rotate(-90, 14, ${(H + PAD.top) / 2})`}
        >
          Check-ins (log scale)
        </text>

        {/* 4★ highlight band — fades in on beat 1 */}
        <rect
          x={xScale(4.0) - 22} y={PAD.top}
          width={44} height={H - PAD.top - PAD.bottom}
          fill="rgba(74, 222, 128, 0.10)"
          className={`ss-band ${beat === 1 ? 'ss-band--on' : ''}`}
        />

        {/* 5★ highlight band — fades in on beat 2 */}
        <rect
          x={xScale(5.0) - 22} y={PAD.top}
          width={44} height={H - PAD.top - PAD.bottom}
          fill="rgba(107, 114, 128, 0.08)"
          className={`ss-band ${beat === 2 ? 'ss-band--on' : ''}`}
        />

        {/* Data points — opacity controlled by CSS beat class on parent SVG */}
        {points.map((r, i) => (
          <circle
            key={r.name + r.city + i}
            className={ratingClass(r.stars)}
            cx={xScale(r.stars) + jitter(r.name)}
            cy={yScale(r.checkins)}
            r={2.5}
            fill={ratingColor(r.stars)}
          />
        ))}

        {/* Beat 1 annotation: 4★ sweet spot */}
        <g className={`ss-ann ${beat === 1 ? 'ss-ann--on' : ''}`}>
          <rect x={xScale(4.0) - 172} y={6} width={160} height={60} fill={YELP_RED} rx={7} />
          <text x={xScale(4.0) - 164} y={26}
            fontSize="12" fontWeight="700" fill="white" fontFamily="inherit">
            The sweet spot
          </text>
          {fourStar && <>
            <text x={xScale(4.0) - 164} y={42}
              fontSize="10" fill="rgba(255,255,255,0.85)" fontFamily="inherit">
              avg {fourStar.avgCheckins} check-ins
            </text>
            <text x={xScale(4.0) - 164} y={55}
              fontSize="10" fill="rgba(255,255,255,0.85)" fontFamily="inherit">
              {fourStar.count.toLocaleString()} restaurants
            </text>
          </>}
          <line
            x1={xScale(4.0) - 92} y1={66} x2={xScale(4.0)} y2={PAD.top}
            stroke={YELP_RED} strokeWidth="1" strokeDasharray="3,3"
          />
        </g>

        {/* Beat 2 annotation: 5★ trap */}
        <g className={`ss-ann ${beat === 2 ? 'ss-ann--on' : ''}`}>
          <rect
            x={xScale(5.0) - 172} y={6} width={160} height={60}
            fill="#2C2C2A" rx={7}
          />
          <text x={xScale(5.0) - 164} y={26}
            fontSize="12" fontWeight="700" fill="white" fontFamily="inherit">
            The perfection trap
          </text>
          {fiveStar && <>
            <text x={xScale(5.0) - 164} y={42}
              fontSize="10" fill="rgba(255,255,255,0.72)" fontFamily="inherit">
              avg {fiveStar.avgCheckins} check-ins
            </text>
            <text x={xScale(5.0) - 164} y={55}
              fontSize="10" fill="rgba(255,255,255,0.72)" fontFamily="inherit">
              only {fiveStar.avgReviews} avg reviews
            </text>
          </>}
          <line
            x1={xScale(5.0) - 92} y1={66} x2={xScale(5.0)} y2={PAD.top}
            stroke="#2C2C2A" strokeWidth="1" strokeDasharray="3,3"
          />
        </g>
      </svg>

      {/* Legend */}
      <div className="ss-legend">
        {[
          ['#ef4444', '<2★'], ['#f87171', '2–3★'], ['#fb923c', '3★'],
          ['#facc15', '3.5★'], ['#4ade80', '4★'], ['#22c55e', '4.5+★'],
        ].map(([color, label]) => (
          <span key={label} className="ss-legend-item">
            <span className="ss-legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="ss-legend-item" style={{ color: '#bbb', marginLeft: 4 }}>
          · {totalShown.toLocaleString()} shown
        </span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
// restaurants prop: pre-loaded array from App.jsx (skips second fetch)
export default function SweetSpotScatter({ restaurants: propRestaurants }) {
  const [fetchedData, setFetchedData] = useState([])
  const [loading, setLoading]         = useState(!propRestaurants)
  const [selCuisines, setSelCuisines] = useState(new Set())
  const [selPrices, setSelPrices]     = useState(new Set([1, 2, 3, 4]))
  const [selCity, setSelCity]         = useState('All cities')
  const [beat, setBeat]               = useState(0)
  const beatRefs                      = useRef([])

  const data = propRestaurants ?? fetchedData

  // Fallback fetch (if not passed from parent)
  useEffect(() => {
    if (propRestaurants) return
    fetch(`${import.meta.env.BASE_URL}sweet-spot.json`)
      .then(r => r.json())
      .then(rows => { setFetchedData(rows); setLoading(false) })
      .catch(() => setLoading(false))
  }, [propRestaurants])

  // IntersectionObserver — same pattern as MapSection
  useEffect(() => {
    const observers = beatRefs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setBeat(i) },
        { rootMargin: '-42% 0px -42% 0px', threshold: 0 }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  // Derive filter options from data
  const { cuisines, cities } = useMemo(() => {
    const cm = {}, ctm = {}
    for (const r of data) {
      cm[r.cuisine]  = (cm[r.cuisine]  || 0) + 1
      ctm[r.city]    = (ctm[r.city]    || 0) + 1
    }
    return {
      cuisines: Object.entries(cm).sort((a, b) => b[1] - a[1]).map(([n]) => n),
      cities:   ['All cities', ...Object.keys(ctm).sort()],
    }
  }, [data])

  // Apply filters
  const filtered = useMemo(() => {
    let list = data
    if (selCuisines.size > 0)  list = list.filter(r => selCuisines.has(r.cuisine))
    if (selPrices.size < 4)    list = list.filter(r => selPrices.has(r.price))
    if (selCity !== 'All cities') list = list.filter(r => r.city === selCity)
    return list
  }, [data, selCuisines, selPrices, selCity])

  // Sample to max 5000 for SVG performance
  const displayPoints = useMemo(() => {
    if (filtered.length <= 5000) return filtered
    const step = filtered.length / 5000
    return Array.from({ length: 5000 }, (_, i) => filtered[Math.floor(i * step)])
  }, [filtered])

  // Per-beat annotation stats
  const fourStar = useMemo(() => {
    const f = filtered.filter(r => r.stars === 4.0)
    if (!f.length) return null
    return {
      count:       f.length,
      avgCheckins: Math.round(f.reduce((s, r) => s + (r.checkins || 0), 0) / f.length),
      avgReviews:  Math.round(f.reduce((s, r) => s + (r.reviews  || 0), 0) / f.length),
    }
  }, [filtered])

  const fiveStar = useMemo(() => {
    const f = filtered.filter(r => r.stars === 5.0)
    if (!f.length) return null
    return {
      count:       f.length,
      avgCheckins: Math.round(f.reduce((s, r) => s + (r.checkins || 0), 0) / f.length),
      avgReviews:  Math.round(f.reduce((s, r) => s + (r.reviews  || 0), 0) / f.length),
    }
  }, [filtered])

  const toggleCuisine = (n) => {
    const s = new Set(selCuisines)
    s.has(n) ? s.delete(n) : s.add(n)
    setSelCuisines(s)
  }

  const togglePrice = (p) => {
    const s = new Set(selPrices)
    s.has(p) ? s.delete(p) : s.add(p)
    setSelPrices(s)
  }

  const clearFilters = () => {
    setSelCuisines(new Set())
    setSelPrices(new Set([1, 2, 3, 4]))
    setSelCity('All cities')
  }

  const hasFilters = selCuisines.size > 0 || selPrices.size < 4 || selCity !== 'All cities'

  return (
    <div className="ss">
      <div className="ss-scrolly">

        {/* ── Left: story beats ──────────────────────────────────────────── */}
        <div className="ss-story-col">

          {BEATS.map(({ num, headline, body, stat, statUnit, color }, i) => (
            <div
              key={i}
              ref={el => beatRefs.current[i] = el}
              className={`ss-beat${beat === i ? ' ss-beat--active' : ''}`}
              style={{ '--accent': color }}
            >
              <div className="ss-beat-inner">
                <span className="ss-beat-num">{num}</span>
                <h2 className="ss-beat-headline">{headline}</h2>
                <p className="ss-beat-body">{body}</p>
                <div className="ss-beat-stat" style={{ '--beat-color': color }}>
                  <span className="ss-beat-stat-n">{stat}</span>
                  <span className="ss-beat-stat-l">{statUnit}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Explore beat — filter panel */}
          <div
            ref={el => beatRefs.current[3] = el}
            className={`ss-beat ss-beat--explore${beat === 3 ? ' ss-beat--active' : ''}`}
          >
            <div className="ss-beat-inner ss-beat-inner--explore">
              <div className="ss-explore-label">
                <span className="ss-beat-num">04</span>
                <span className="ss-explore-heading">Explore yourself</span>
              </div>

              {loading ? (
                <div className="ss-loading">Loading data…</div>
              ) : (
                <div className="ss-fp">
                  <div className="ss-fp-count">
                    <strong>{filtered.length.toLocaleString()}</strong>
                    <span> of {data.length.toLocaleString()} restaurants</span>
                  </div>

                  {/* City */}
                  <div className="ss-fp-group">
                    <div className="ss-fp-label">City</div>
                    <select
                      className="ss-fp-select"
                      value={selCity}
                      onChange={e => setSelCity(e.target.value)}
                    >
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Price */}
                  <div className="ss-fp-group">
                    <div className="ss-fp-label">Price tier</div>
                    <div className="ss-fp-pills">
                      {[1, 2, 3, 4].map(p => (
                        <button
                          key={p}
                          className={`ss-fp-pill${selPrices.has(p) ? ' active' : ''}`}
                          onClick={() => togglePrice(p)}
                        >
                          {PRICE_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cuisine */}
                  <div className="ss-fp-group">
                    <div className="ss-fp-label">Cuisine type</div>
                    <div className="ss-fp-checks">
                      {cuisines.map(c => (
                        <label key={c} className="ss-fp-check">
                          <input
                            type="checkbox"
                            checked={selCuisines.has(c)}
                            onChange={() => toggleCuisine(c)}
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {hasFilters && (
                    <button className="ss-fp-clear" onClick={clearFilters}>
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Right: sticky chart ─────────────────────────────────────────── */}
        <div className="ss-chart-col">
          {loading ? (
            <div className="ss-chart-loading">
              <div className="ss-spinner" />
              <p>Loading data…</p>
            </div>
          ) : (
            <ScatterChart
              points={displayPoints}
              beat={beat}
              fourStar={fourStar}
              fiveStar={fiveStar}
              totalShown={displayPoints.length}
              totalAll={data.length}
            />
          )}
        </div>

      </div>
    </div>
  )
}
