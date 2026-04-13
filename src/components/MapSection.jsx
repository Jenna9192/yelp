import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapSection.css'

// ── Helpers ────────────────────────────────────────────────────────────────────
const PRICE_LABELS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
const DENSITY_LABELS = { urban: 'Urban', suburban: 'Suburban', rural: 'Rural' }
const DENSITY_ICONS  = { urban: '🏙', suburban: '🏘', rural: '🌾' }

const STAR_COLOR = (stars) => {
  if (stars >= 4.5) return '#22c55e'
  if (stars >= 4.0) return '#4ade80'
  if (stars >= 3.5) return '#facc15'
  if (stars >= 3.0) return '#fb923c'
  if (stars >= 2.0) return '#f87171'
  return '#ef4444'
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
      ctx.fillStyle = STAR_COLOR(rest.stars ?? 0)
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
        <span className="tt-tag density">{DENSITY_ICONS[item.density]} {DENSITY_LABELS[item.density]}</span>
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
    onChange({ city: '', cuisines: [], prices: [], densities: [], openOnly: false, deliveryOnly: false })
    setCityQuery('')
  }

  const hasFilters = filters.city || filters.cuisines.length ||
    filters.prices.length || filters.densities.length ||
    filters.openOnly || filters.deliveryOnly

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

      {/* Area type */}
      <div className="fp-group">
        <div className="fp-label">Area type</div>
        <div className="fp-pills wrap">
          {['urban', 'suburban', 'rural'].map(d => (
            <button
              key={d}
              className={`fp-pill ${filters.densities.includes(d) ? 'active' : ''}`}
              onClick={() => toggleSet('densities', d)}
            >
              {DENSITY_ICONS[d]} {DENSITY_LABELS[d]}
            </button>
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
      <div className="legend-title">Rating</div>
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
            <p><strong>Urban / Rural classification:</strong> Based on restaurant count per city in the dataset — Urban ≥ 500, Suburban ≥ 100, Rural &lt; 100. Major metros (Philadelphia, Nashville, Tucson…) are well-represented; small towns may be undersampled.</p>
            <p><strong>Geographic coverage:</strong> Primarily USA &amp; Canada with some international entries. Dot color = star rating; dot size scales with zoom level.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main map section ───────────────────────────────────────────────────────────
export default function MapSection({ data: rawData, loading, error }) {
  const [tooltip,  setTooltip]  = useState({ item: null, pos: null })
  const [filters,  setFilters]  = useState({
    city: '', cuisines: [], prices: [], densities: [],
    openOnly: false, deliveryOnly: false,
  })
  const mapWrapRef = useRef(null)

  const filtered = useMemo(() => {
    if (!rawData) return []
    let list = rawData.restaurants
    if (filters.city)             list = list.filter(r => r.city === filters.city)
    if (filters.cuisines.length)  list = list.filter(r => filters.cuisines.includes(r.cuisine))
    if (filters.prices.length)    list = list.filter(r => filters.prices.includes(r.price))
    if (filters.densities.length) list = list.filter(r => filters.densities.includes(r.density))
    if (filters.openOnly)         list = list.filter(r => r.open === 1)
    if (filters.deliveryOnly)     list = list.filter(r => r.delivery)

    return list
  }, [rawData, filters])

  const handleHover  = useCallback((item, pos) => setTooltip({ item, pos }), [])
  const handleLeave  = useCallback(() => setTooltip({ item: null, pos: null }), [])

  return (
    <section id="map-section" className="map-section">
      <div className="map-section-header">
        <div className="map-section-title">
          <h2>Restaurant Success Map</h2>
          <p>Geographic scatter of {rawData ? rawData.restaurants.length.toLocaleString() : '–'} restaurants · colored by rating</p>
        </div>
      </div>

      <div className="map-body">
        {loading && (
          <div className="map-loading">
            <div className="map-spinner" />
            <p>Loading restaurant data…</p>
          </div>
        )}
        {error && <div className="map-error">Failed to load data: {error}</div>}

        {!loading && !error && rawData && (
          <>
            <FilterPanel
              meta={rawData.meta}
              filters={filters}
              onChange={setFilters}
              total={rawData.restaurants.length}
              shown={filtered.length}
            />

            <div className="map-wrap" ref={mapWrapRef}>

              <MapContainer
                center={[37.5, -96]}
                zoom={4}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ScatterLayer data={filtered} onHover={handleHover} onLeave={handleLeave} />
              </MapContainer>

              <Legend />

              <Tooltip item={tooltip.item} pos={tooltip.pos} mapRef={mapWrapRef} />
            </div>
          </>
        )}
      </div>

      <ScopeDrawer scope={rawData?.scope} />
    </section>
  )
}
