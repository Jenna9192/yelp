import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapSection.css'
import { useInView } from '../hooks/useInView'

// ── Helpers ────────────────────────────────────────────────────────────────────
const PRICE_LABELS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
const CLOSED_COLOR = '#b0b0b0'

const DOT_COLOR = (rest) => {
  if (!rest.open) return CLOSED_COLOR
  const s = rest.stars ?? 0
  if (s >= 4.5) return '#22c55e'
  if (s >= 4.0) return '#4ade80'
  if (s >= 3.5) return '#facc15'
  if (s >= 3.0) return '#fb923c'
  if (s >= 2.0) return '#f87171'
  return '#ef4444'
}

// Still used for tooltip star display (open restaurants only)
const STAR_COLOR = (stars) => {
  const s = stars ?? 0
  if (s >= 4.5) return '#22c55e'
  if (s >= 4.0) return '#4ade80'
  if (s >= 3.5) return '#facc15'
  if (s >= 3.0) return '#fb923c'
  if (s >= 2.0) return '#f87171'
  return '#ef4444'
}

// ── Auto-fit to actual data extent on first load ───────────────────────────────
function FitBounds({ restaurants }) {
  const map    = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (!restaurants?.length || fitted.current) return
    fitted.current = true

    let minLat = Infinity, maxLat = -Infinity
    let minLng = Infinity, maxLng = -Infinity
    restaurants.forEach(({ lat, lng }) => {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    })

    map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [32, 32] })
  }, [restaurants, map])

  return null
}

// ── Programmatic map controller — responds to active story beat ────────────────
function MapController({ beat, dataBounds }) {
  const map  = useMap()
  const prev = useRef(-1) // -1 = not initialized yet (let FitBounds run first)

  useEffect(() => {
    if (beat === prev.current) return
    if (prev.current === -1) { prev.current = beat; return }  // first render, skip
    prev.current = beat

    if (beat === 2) {
      // Zoom into Center City Philadelphia
      map.flyTo([39.952, -75.160], 13, { duration: 1.5, easeLinearity: 0.25 })
    } else if (dataBounds) {
      // Return to full data extent
      map.flyToBounds(dataBounds, { padding: [48, 48], duration: 1.2 })
    }
  }, [beat, map, dataBounds])

  return null
}

// ── Story beat content ─────────────────────────────────────────────────────────
const BEATS = [
  {
    num: '01',
    headline: 'Every restaurant in the region, plotted',
    body:     'Over 20,000 Yelp listings across greater Philadelphia and South Jersey — from Delaware County to Camden County. Each dot is one restaurant.',
    stat:     '20,317',
    statUnit: 'restaurants',
    color:    '#d32323',
  },
  {
    num: '02',
    headline: 'Gray means gone',
    body:     'About 1 in 5 restaurants has permanently closed. Gray dots cluster in outer commercial strips and lower-traffic corridors — areas with less foot traffic and higher turnover.',
    stat:     '~18%',
    statUnit: 'permanently closed',
    color:    '#b0b0b0',
  },
  {
    num: '03',
    headline: 'Top-rated neighborhoods emerge',
    body:     'Green dots — 4 stars and above — concentrate in Center City, Fishtown, and the Italian Market. High density, walkability, and diverse competition all correlate with better ratings.',
    stat:     '~34%',
    statUnit: 'rated 4+ stars',
    color:    '#22c55e',
  },
]

// ── Region mask — white overlay covering everything outside PA + NJ ────────────
// Technique: one GeoJSON Polygon whose first ring is the entire world, and whose
// subsequent rings are the PA/NJ state boundaries acting as holes.
// fillRule:'evenodd' makes the holes transparent without needing to reverse
// winding order manually.
function RegionMask() {
  const [maskData,   setMaskData]   = useState(null)
  const [borderData, setBorderData] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}region.geojson`)
      .then(r => r.json())
      .then(geoData => {
        setBorderData(geoData)

        // Flatten all polygon rings from both state features
        const stateRings = geoData.features.flatMap(f => {
          const { type, coordinates } = f.geometry
          if (type === 'Polygon')      return [coordinates[0]]
          if (type === 'MultiPolygon') return coordinates.map(p => p[0])
          return []
        })

        setMaskData({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              // Outer ring — covers the whole world
              [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
              // State rings become holes via even-odd fill rule
              ...stateRings,
            ],
          },
        })
      })
      .catch(() => {}) // degrade gracefully if file missing
  }, [])

  return (
    <>
      {maskData && (
        <GeoJSON
          key="mask"
          data={maskData}
          style={() => ({
            fillColor:   '#f8f8f8',
            fillOpacity: 0.94,
            stroke:      false,
            fillRule:    'evenodd',
          })}
        />
      )}
      {borderData && (
        <GeoJSON
          key="border"
          data={borderData}
          style={() => ({
            fill:   false,
            color:  '#aaaaaa',
            weight: 1.5,
          })}
        />
      )}
    </>
  )
}

// ── Canvas scatter — placed in map container, not overlay pane ─────────────────
// This is the key fix: the canvas lives directly in the map container element
// (which is never CSS-transformed by Leaflet), so it never jumps during zoom.
// We use RAF-throttled redraws on every move/zoom event for smooth animations.
function ScatterLayer({ data, onHover, onLeave }) {
  const map       = useMap()
  const dataRef   = useRef(data)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const hoverRef  = useRef(null)
  dataRef.current = data

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return
    const ctx  = canvas.getContext('2d')
    const size = map.getSize()

    // Keep canvas dimensions in sync with the map
    if (canvas.width  !== size.x) canvas.width  = size.x
    if (canvas.height !== size.y) canvas.height = size.y
    ctx.clearRect(0, 0, size.x, size.y)

    const bounds = map.getBounds()
    const zoom   = map.getZoom()
    const r      = Math.max(2.5, Math.min(6, zoom - 2.5))

    ctx.globalAlpha = 0.85
    dataRef.current.forEach(rest => {
      if (!bounds.contains([rest.lat, rest.lng])) return
      const pt = map.latLngToContainerPoint([rest.lat, rest.lng])
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
      ctx.fillStyle = DOT_COLOR(rest)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }, [map])

  // Schedule at most one draw per animation frame
  const schedule = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => { draw(); rafRef.current = null })
  }, [draw])

  useEffect(() => {
    // ── Attach canvas directly to the map container ────────────────────────────
    // The container is never CSS-transformed — only the internal panes are.
    // All Leaflet pane transforms (used for smooth pan/zoom) live inside it,
    // so our canvas is unaffected and never jumps.
    const container = map.getContainer()
    const canvas    = document.createElement('canvas')
    const size      = map.getSize()
    canvas.width    = size.x
    canvas.height   = size.y
    canvas.style.cssText =
      'position:absolute;top:0;left:0;z-index:500;pointer-events:all;'
    container.appendChild(canvas)
    canvasRef.current = canvas

    // ── Hit-test on mouse move ─────────────────────────────────────────────────
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const px   = e.clientX - rect.left
      const py   = e.clientY - rect.top
      const zoom = map.getZoom()
      const r    = Math.max(2.5, Math.min(6, zoom - 2.5)) + 5

      const bounds = map.getBounds()
      let closest = null, minDist = Infinity
      dataRef.current.forEach(rest => {
        // Skip points outside the current viewport before the more expensive projection
        if (!bounds.contains([rest.lat, rest.lng])) return
        const pt = map.latLngToContainerPoint([rest.lat, rest.lng])
        const dx = pt.x - px, dy = pt.y - py
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < r && d < minDist) { minDist = d; closest = rest }
      })

      if (closest !== hoverRef.current) {
        hoverRef.current = closest
        if (closest) {
          const pt = map.latLngToContainerPoint([closest.lat, closest.lng])
          onHover(closest, { x: pt.x, y: pt.y })
        } else {
          onLeave()
        }
      }
    }

    const onMouseLeave = () => { hoverRef.current = null; onLeave() }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)

    // Redraw on every map event — `move` fires continuously during pan/zoom
    map.on('move zoom moveend zoomend resize viewreset', schedule)
    schedule()

    return () => {
      map.off('move zoom moveend zoomend resize viewreset', schedule)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      canvas.remove()
    }
  }, [map, schedule, onHover, onLeave])

  // Redraw when filtered data changes
  useEffect(() => { schedule() }, [data, schedule])

  return null
}

// ── Tooltip ────────────────────────────────────────────────────────────────────
function Tooltip({ item, pos, mapRef }) {
  if (!item || !pos) return null
  const mapRect = mapRef.current?.getBoundingClientRect()
  if (!mapRect) return null

  const flip  = pos.x > mapRect.width  - 270
  const flipY = pos.y > mapRect.height - 230
  const style = {
    left:   flip  ? 'auto' : pos.x + 16,
    right:  flip  ? mapRect.width  - pos.x + 16 : 'auto',
    top:    flipY ? 'auto' : pos.y - 8,
    bottom: flipY ? mapRect.height - pos.y - 8 : 'auto',
  }

  const stars = item.stars ?? '–'
  const price = item.price ? PRICE_LABELS[item.price] : '–'

  return (
    <div className="tt" style={style}>
      <div className="tt-name">{item.name}</div>
      <div className="tt-loc">{item.city}, {item.state}</div>
      <div className="tt-tags">
        <span className="tt-tag cuisine">{item.cuisine}</span>
        <span className="tt-tag price">{price}</span>
        <span className={`tt-tag ${item.open ? 'open' : 'closed'}`}>
          {item.open ? 'Open' : 'Closed'}
        </span>
      </div>
      <div className="tt-stats">
        <div className="tt-stat">
          <span className="tt-stars" style={{ color: STAR_COLOR(item.stars ?? 0) }}>
            {'★'.repeat(Math.round(stars))}{'☆'.repeat(5 - Math.round(stars))}
          </span>
          <span className="tt-stat-label">{stars} stars</span>
        </div>
        <div className="tt-stat">
          <span className="tt-stat-val">{(item.reviews ?? 0).toLocaleString()}</span>
          <span className="tt-stat-label">reviews</span>
        </div>
        <div className="tt-stat">
          <span className="tt-stat-val">{(item.checkins ?? 0).toLocaleString()}</span>
          <span className="tt-stat-label">check-ins</span>
        </div>
      </div>
      {item.delivery && <div className="tt-delivery">Delivery available</div>}
    </div>
  )
}

// ── Filter Panel ───────────────────────────────────────────────────────────────
function FilterPanel({ meta, filters, onChange, total, shown }) {
  const [cityQuery, setCityQuery] = useState('')
  const dropdownRef = useRef(null)

  const suggestions = useMemo(() => {
    if (!cityQuery.trim()) return []
    const q = cityQuery.toLowerCase()
    return meta.top_cities.filter(c => c.toLowerCase().includes(q)).slice(0, 8)
  }, [cityQuery, meta.top_cities])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setCityQuery('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleSet = (key, val) => {
    const set = filters[key]
    onChange({ ...filters, [key]: set.includes(val) ? set.filter(x => x !== val) : [...set, val] })
  }

  const clearAll = () => {
    onChange({ city: '', cuisines: [], prices: [], openOnly: false, deliveryOnly: false })
    setCityQuery('')
  }

  const hasFilters = filters.city || filters.cuisines.length ||
    filters.prices.length || filters.openOnly || filters.deliveryOnly

  const displayedShown = shown

  return (
    <aside className="fp">
      <div className="fp-head">
        <span className="fp-title">Filters</span>
        {hasFilters && <button className="fp-clear" onClick={clearAll}>Clear all</button>}
      </div>

      <div className="fp-count">
        <strong>{displayedShown.toLocaleString()}</strong>
        <span> of {total.toLocaleString()} restaurants</span>
      </div>

      {/* City */}
      <div className="fp-group">
        <div className="fp-label">City</div>
        <div className="fp-city" ref={dropdownRef}>
          {filters.city
            ? <div className="fp-city-chip">
                <span>{filters.city}</span>
                <button onClick={() => onChange({ ...filters, city: '' })}>×</button>
              </div>
            : <>
                <input
                  className="fp-city-input"
                  placeholder="Search 993 cities…"
                  value={cityQuery}
                  onChange={e => setCityQuery(e.target.value)}
                />
                {suggestions.length > 0 && (
                  <ul className="fp-suggestions">
                    {suggestions.map(c => (
                      <li key={c} onMouseDown={() => {
                        onChange({ ...filters, city: c })
                        setCityQuery('')
                      }}>{c}</li>
                    ))}
                  </ul>
                )}
              </>
          }
        </div>
      </div>

      {/* Price */}
      <div className="fp-group">
        <div className="fp-label">Price tier</div>
        <div className="fp-pills">
          {[1, 2, 3, 4].map(p => (
            <button
              key={p}
              className={`fp-pill ${filters.prices.includes(p) ? 'active' : ''}`}
              onClick={() => toggleSet('prices', p)}
            >
              {PRICE_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Cuisine */}
      <div className="fp-group">
        <div className="fp-label">Cuisine type</div>
        <div className="fp-checks">
          {meta.cuisines.map(c => (
            <label key={c} className="fp-check">
              <input
                type="checkbox"
                checked={filters.cuisines.includes(c)}
                onChange={() => toggleSet('cuisines', c)}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="fp-group">
        <label className="fp-toggle">
          <input type="checkbox" checked={filters.openOnly}
            onChange={e => onChange({ ...filters, openOnly: e.target.checked })} />
          <span>Open businesses only</span>
        </label>
        <label className="fp-toggle">
          <input type="checkbox" checked={filters.deliveryOnly}
            onChange={e => onChange({ ...filters, deliveryOnly: e.target.checked })} />
          <span>Delivery available</span>
        </label>
      </div>
    </aside>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="legend">
      <div className="legend-title">Open · Rating</div>
      {[
        ['#22c55e', '4.5 – 5.0 ★'],
        ['#4ade80', '4.0 – 4.5 ★'],
        ['#facc15', '3.5 – 4.0 ★'],
        ['#fb923c', '3.0 – 3.5 ★'],
        ['#f87171', '2.0 – 3.0 ★'],
        ['#ef4444', '< 2.0 ★'],
      ].map(([color, label]) => (
        <div key={label} className="legend-row">
          <span className="legend-dot" style={{ background: color }} />
          <span>{label}</span>
        </div>
      ))}
      <div className="legend-divider" />
      <div className="legend-row">
        <span className="legend-dot" style={{ background: CLOSED_COLOR }} />
        <span>Closed</span>
      </div>
    </div>
  )
}

// ── Scope drawer ───────────────────────────────────────────────────────────────
function ScopeDrawer({ scope }) {
  const [open, setOpen] = useState(false)
  if (!scope) return null
  return (
    <div className="scope">
      <button className="scope-btn" onClick={() => setOpen(o => !o)}>
        Dataset scope &amp; methodology {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="scope-body">
          <div className="scope-stats">
            {[
              [scope.cities.toLocaleString(),         'Cities covered'],
              [scope.total.toLocaleString(),           'Total restaurants'],
              [scope.open_count.toLocaleString(),      'Open businesses'],
              [scope.delivery_count.toLocaleString(),  'Delivery-enabled'],
            ].map(([val, lbl]) => (
              <div key={lbl} className="scope-stat">
                <div className="scope-val">{val}</div>
                <div className="scope-lbl">{lbl}</div>
              </div>
            ))}
          </div>
          <div className="scope-notes">
            <p><strong>Date range:</strong> {scope.date_note}</p>
            <p><strong>Delivery-only businesses:</strong> {scope.delivery_note}</p>
            <p><strong>Geographic concentration:</strong> This is <em>not</em> a national random sample. Yelp selected specific metro areas for their academic release. PA (Philadelphia) alone accounts for ~24% of all restaurants, followed by FL (17%), TN/Nashville (8%), MO/St. Louis (8%), and IN/Indianapolis (8%). Findings should be interpreted within these markets, not generalized nationally.</p>
            <p><strong>Urban / Rural classification:</strong> Based on geographic density — the map is divided into ~5 km grid cells and each restaurant is classified by how many restaurants share its cell (Urban ≥ 30, Suburban ≥ 8, Rural &lt; 8). This correctly handles restaurants in small municipalities inside large metro areas.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main map section ───────────────────────────────────────────────────────────
export default function MapSection({ data: rawData, loading, error }) {
  const [tooltip, setTooltip] = useState({ item: null, pos: null })
  const [filters, setFilters] = useState({
    city: '', cuisines: [], prices: [],
    openOnly: false, deliveryOnly: false,
  })
  const [beat, setBeat]     = useState(0)
  const beatRefs            = useRef([])
  const mapWrapRef          = useRef(null)
  const [exploreRef, exploreInView] = useInView({ threshold: 0.15 })

  // Compute bounding box once for MapController flyback
  const dataBounds = useMemo(() => {
    if (!rawData?.restaurants?.length) return null
    let minLat = Infinity, maxLat = -Infinity
    let minLng = Infinity, maxLng = -Infinity
    rawData.restaurants.forEach(({ lat, lng }) => {
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng
    })
    return [[minLat, minLng], [maxLat, maxLng]]
  }, [rawData])

  // IntersectionObserver: which story beat is centered on screen
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

  const filtered = useMemo(() => {
    if (!rawData) return []
    let list = rawData.restaurants
    if (filters.city)            list = list.filter(r => r.city === filters.city)
    if (filters.cuisines.length) list = list.filter(r => filters.cuisines.includes(r.cuisine))
    if (filters.prices.length)   list = list.filter(r => filters.prices.includes(r.price))
    if (filters.openOnly)        list = list.filter(r => r.open === 1)
    if (filters.deliveryOnly)    list = list.filter(r => r.delivery)
    return list
  }, [rawData, filters])

  const handleHover = useCallback((item, pos) => setTooltip({ item, pos }), [])
  const handleLeave = useCallback(() => setTooltip({ item: null, pos: null }), [])

  const mapContent = rawData && !loading && !error

  return (
    <section id="map-section" className="map-section">

      {/* ── Scrollytelling: story steps left + sticky map right ───────────── */}
      <div className="ms-scrolly">

        {/* Left column: story beats + explore step */}
        <div className="ms-story-col">
          {BEATS.map(({ num, headline, body, stat, statUnit, color }, i) => (
            <div
              key={i}
              ref={el => beatRefs.current[i] = el}
              className={`ms-beat${beat === i ? ' ms-beat--active' : ''}`}
            >
              <div className="ms-beat-inner">
                <span className="ms-beat-num">{num}</span>
                <h2 className="ms-beat-headline">{headline}</h2>
                <p className="ms-beat-body">{body}</p>
                <div className="ms-beat-stat" style={{ '--beat-color': color }}>
                  <span className="ms-beat-stat-n">{stat}</span>
                  <span className="ms-beat-stat-l">{statUnit}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Explore step: filter panel replaces story text */}
          <div
            className={`ms-beat ms-beat--explore${beat === 3 ? ' ms-beat--active' : ''}`}
            ref={el => beatRefs.current[3] = el}
          >
            <div className="ms-beat-inner ms-beat-inner--explore">
              <div className="ms-explore-label">
                <span className="ms-beat-num">04</span>
                <span className="ms-explore-heading">Explore yourself</span>
              </div>
              {mapContent
                ? <FilterPanel
                    meta={rawData.meta}
                    filters={filters}
                    onChange={setFilters}
                    total={rawData.restaurants.length}
                    shown={filtered.length}
                  />
                : <div className="ms-explore-loading">Loading filters…</div>
              }
            </div>
          </div>
        </div>

        {/* Right column: sticky map */}
        <div className="ms-map-col">
          {/* Chapter progress dots */}
          <div className="ms-chapter-dots">
            {[...BEATS, { num: '04' }].map((_, i) => (
              <div
                key={i}
                className={`ms-chapter-dot${beat === i ? ' active' : ''}`}
                title={`Chapter ${i + 1}`}
              />
            ))}
          </div>

          {/* Active chapter label */}
          <div className={`ms-chapter-label${beat < 3 ? ' visible' : ''}`}>
            <span className="ms-chapter-label-num">{String(beat + 1).padStart(2, '0')}</span>
            <span>{BEATS[beat]?.headline}</span>
          </div>

          {loading && (
            <div className="map-loading">
              <div className="map-spinner" />
              <p>Loading restaurant data…</p>
            </div>
          )}
          {error && <div className="map-error">Failed to load data: {error}</div>}

          {mapContent && (
            <div className="ms-map-inner" ref={mapWrapRef}>
              <MapContainer
                center={[39.98, -75.23]}
                zoom={10}
                minZoom={9}
                maxBounds={[[39.2, -76.3], [40.7, -74.3]]}
                maxBoundsViscosity={1.0}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <FitBounds restaurants={rawData.restaurants} />
                <MapController beat={beat} dataBounds={dataBounds} />
                <RegionMask />
                <ScatterLayer data={filtered} onHover={handleHover} onLeave={handleLeave} />
              </MapContainer>
              <Legend />
              <Tooltip item={tooltip.item} pos={tooltip.pos} mapRef={mapWrapRef} />
            </div>
          )}
        </div>
      </div>

      {/* Dataset scope drawer */}
      <ScopeDrawer scope={rawData?.scope} />
    </section>
  )
}
