import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './RestaurantMap.css'

// ── Constants ──────────────────────────────────────────────────────────────────
const PRICE_LABELS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
const DENSITY_LABELS = { urban: 'Urban', suburban: 'Suburban', rural: 'Rural' }
const DENSITY_ICONS  = { urban: '🏙', suburban: '🏘', rural: '🌾' }

const STAR_COLOR = (stars) => {
  if (stars >= 4.5) return '#22c55e'   // green-500
  if (stars >= 4.0) return '#86efac'   // green-300
  if (stars >= 3.5) return '#facc15'   // yellow-400
  if (stars >= 3.0) return '#fb923c'   // orange-400
  if (stars >= 2.0) return '#f87171'   // red-400
  return '#ef4444'                     // red-500
}

const MAX_DISPLAY = 12000 // canvas handles this fine

// ── Canvas scatter layer ───────────────────────────────────────────────────────
function ScatterLayer({ data, onHover, onLeave }) {
  const map = useMap()
  const canvasRef = useRef(null)
  const layerRef = useRef(null)
  const hoverRef = useRef(null)
  const dataRef  = useRef(data)
  dataRef.current = data

  const draw = useCallback(() => {
    const layer = layerRef.current
    if (!layer) return
    const canvas = layer.getContainer()
    const ctx = canvas.getContext('2d')
    const size = map.getSize()
    canvas.width  = size.x
    canvas.height = size.y
    ctx.clearRect(0, 0, size.x, size.y)

    const bounds = map.getBounds()
    const zoom   = map.getZoom()
    const r = Math.max(2, Math.min(7, zoom - 4))

    dataRef.current.forEach(rest => {
      if (!bounds.contains([rest.lat, rest.lng])) return
      const pt = map.latLngToContainerPoint([rest.lat, rest.lng])
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
      ctx.fillStyle   = STAR_COLOR(rest.stars ?? 0)
      ctx.globalAlpha = 0.82
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth   = 0.5
      ctx.stroke()
    })
    ctx.globalAlpha = 1
  }, [map])

  // hit-test: find nearest restaurant to mouse within 10px
  const hitTest = useCallback((containerPt) => {
    const zoom = map.getZoom()
    const r = Math.max(2, Math.min(7, zoom - 4)) + 4 // generous hit area
    let closest = null
    let minDist = Infinity
    dataRef.current.forEach(rest => {
      const pt = map.latLngToContainerPoint([rest.lat, rest.lng])
      const dx = pt.x - containerPt.x
      const dy = pt.y - containerPt.y
      const d  = Math.sqrt(dx * dx + dy * dy)
      if (d < r && d < minDist) { minDist = d; closest = rest }
    })
    return closest
  }, [map])

  useEffect(() => {
    const CanvasLayer = L.Layer.extend({
      onAdd(map) {
        const size = map.getSize()
        const canvas = L.DomUtil.create('canvas', 'leaflet-scatter-canvas')
        canvas.width  = size.x
        canvas.height = size.y
        canvas.style.position = 'absolute'
        canvas.style.top  = '0'
        canvas.style.left = '0'
        canvas.style.pointerEvents = 'all'
        this._canvas = canvas
        map.getPanes().overlayPane.appendChild(canvas)

        canvas.addEventListener('mousemove', (e) => {
          const rect = canvas.getBoundingClientRect()
          const pt   = L.point(e.clientX - rect.left, e.clientY - rect.top)
          const found = hitTest(pt)
          if (found !== hoverRef.current) {
            hoverRef.current = found
            if (found) {
              const mapPt = map.latLngToContainerPoint([found.lat, found.lng])
              onHover(found, { x: mapPt.x, y: mapPt.y })
            } else {
              onLeave()
            }
          }
        })
        canvas.addEventListener('mouseleave', () => {
          hoverRef.current = null
          onLeave()
        })

        return this
      },
      getContainer() { return this._canvas },
      onRemove() {
        if (this._canvas) L.DomUtil.remove(this._canvas)
      },
    })

    const layer = new CanvasLayer()
    layer.addTo(map)
    layerRef.current = layer
    canvasRef.current = layer.getContainer()

    const redraw = () => draw()
    map.on('moveend zoomend resize', redraw)
    draw()

    return () => {
      map.off('moveend zoomend resize', redraw)
      map.removeLayer(layer)
    }
  }, [map, draw, hitTest, onHover, onLeave])

  // redraw when data changes
  useEffect(() => { draw() }, [data, draw])

  return null
}

// ── Tooltip ────────────────────────────────────────────────────────────────────
function Tooltip({ item, pos, mapRef }) {
  if (!item || !pos) return null
  const mapRect = mapRef.current?.getBoundingClientRect()
  if (!mapRect) return null

  const flip  = pos.x > mapRect.width  - 260
  const flipY = pos.y > mapRect.height - 220
  const style = {
    left:   flip  ? 'auto' : pos.x + 14,
    right:  flip  ? mapRect.width  - pos.x + 14 : 'auto',
    top:    flipY ? 'auto' : pos.y - 10,
    bottom: flipY ? mapRect.height - pos.y - 10  : 'auto',
  }

  const stars = item.stars ?? '–'
  const price = item.price ? PRICE_LABELS[item.price] : '–'

  return (
    <div className="map-tooltip" style={style}>
      <div className="tt-name">{item.name}</div>
      <div className="tt-location">{item.city}, {item.state}</div>
      <div className="tt-tags">
        <span className="tag cuisine">{item.cuisine}</span>
        <span className="tag price">{price}</span>
        <span className="tag density">{DENSITY_ICONS[item.density]} {DENSITY_LABELS[item.density]}</span>
        {item.open ? <span className="tag open">Open</span> : <span className="tag closed">Closed</span>}
      </div>
      <div className="tt-stats">
        <div className="stat">
          <span className="stat-val" style={{ color: STAR_COLOR(item.stars ?? 0) }}>
            {'★'.repeat(Math.round(stars))}{'☆'.repeat(5 - Math.round(stars))}
          </span>
          <span className="stat-label">{stars} stars</span>
        </div>
        <div className="stat">
          <span className="stat-val">{item.reviews?.toLocaleString()}</span>
          <span className="stat-label">reviews</span>
        </div>
        <div className="stat">
          <span className="stat-val">{item.checkins?.toLocaleString()}</span>
          <span className="stat-label">check-ins</span>
        </div>
      </div>
      {item.delivery && <div className="tt-delivery">Delivery available</div>}
    </div>
  )
}

// ── Filter Panel ───────────────────────────────────────────────────────────────
function FilterPanel({ meta, filters, onChange, total, shown }) {
  const [cityQuery, setCityQuery] = useState('')

  const citySuggestions = useMemo(() => {
    if (!cityQuery.trim()) return []
    const q = cityQuery.toLowerCase()
    return meta.top_cities
      .filter(c => c.toLowerCase().includes(q))
      .slice(0, 10)
  }, [cityQuery, meta.top_cities])

  const toggleCuisine = (c) => {
    const next = filters.cuisines.includes(c)
      ? filters.cuisines.filter(x => x !== c)
      : [...filters.cuisines, c]
    onChange({ ...filters, cuisines: next })
  }

  const togglePrice = (p) => {
    const next = filters.prices.includes(p)
      ? filters.prices.filter(x => x !== p)
      : [...filters.prices, p]
    onChange({ ...filters, prices: next })
  }

  const toggleDensity = (d) => {
    const next = filters.densities.includes(d)
      ? filters.densities.filter(x => x !== d)
      : [...filters.densities, d]
    onChange({ ...filters, densities: next })
  }

  const clearAll = () => {
    onChange({ city: '', cuisines: [], prices: [], densities: [], openOnly: false, deliveryOnly: false })
    setCityQuery('')
  }

  const hasFilters = filters.city || filters.cuisines.length || filters.prices.length ||
    filters.densities.length || filters.openOnly || filters.deliveryOnly

  return (
    <aside className="filter-panel">
      <div className="filter-header">
        <h2>Filters</h2>
        {hasFilters && <button className="clear-btn" onClick={clearAll}>Clear all</button>}
      </div>

      <div className="filter-count">
        Showing <strong>{shown.toLocaleString()}</strong> of {total.toLocaleString()} restaurants
      </div>

      {/* City search */}
      <div className="filter-group">
        <label className="filter-label">City</label>
        <div className="city-search">
          <input
            type="text"
            placeholder="Search cities…"
            value={cityQuery || filters.city}
            onChange={e => {
              setCityQuery(e.target.value)
              if (!e.target.value) onChange({ ...filters, city: '' })
            }}
            className="city-input"
          />
          {cityQuery && (
            <ul className="city-suggestions">
              {citySuggestions.length ? citySuggestions.map(c => (
                <li key={c} onClick={() => {
                  onChange({ ...filters, city: c })
                  setCityQuery('')
                }}>{c}</li>
              )) : <li className="no-match">No match</li>}
            </ul>
          )}
          {filters.city && (
            <div className="city-active">
              <span>{filters.city}</span>
              <button onClick={() => { onChange({ ...filters, city: '' }); setCityQuery('') }}>×</button>
            </div>
          )}
        </div>
      </div>

      {/* Price tier */}
      <div className="filter-group">
        <label className="filter-label">Price tier</label>
        <div className="pill-row">
          {[1, 2, 3, 4].map(p => (
            <button
              key={p}
              className={`pill ${filters.prices.includes(p) ? 'active' : ''}`}
              onClick={() => togglePrice(p)}
            >
              {PRICE_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Cuisine */}
      <div className="filter-group">
        <label className="filter-label">Cuisine type</label>
        <div className="cuisine-list">
          {meta.cuisines.map(c => (
            <label key={c} className={`check-row ${filters.cuisines.includes(c) ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={filters.cuisines.includes(c)}
                onChange={() => toggleCuisine(c)}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Urban/Rural */}
      <div className="filter-group">
        <label className="filter-label">Area type</label>
        <div className="pill-row">
          {['urban', 'suburban', 'rural'].map(d => (
            <button
              key={d}
              className={`pill ${filters.densities.includes(d) ? 'active' : ''}`}
              onClick={() => toggleDensity(d)}
            >
              {DENSITY_ICONS[d]} {DENSITY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="filter-group">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={filters.openOnly}
            onChange={e => onChange({ ...filters, openOnly: e.target.checked })}
          />
          <span>Open businesses only</span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={filters.deliveryOnly}
            onChange={e => onChange({ ...filters, deliveryOnly: e.target.checked })}
          />
          <span>Delivery available only</span>
        </label>
      </div>
    </aside>
  )
}

// ── Scope Panel ────────────────────────────────────────────────────────────────
function ScopePanel({ scope }) {
  const [open, setOpen] = useState(false)
  if (!scope) return null
  return (
    <div className="scope-panel">
      <button className="scope-toggle" onClick={() => setOpen(o => !o)}>
        <span>Dataset scope</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="scope-body">
          <div className="scope-grid">
            <div className="scope-stat">
              <div className="scope-val">{scope.cities.toLocaleString()}</div>
              <div className="scope-lbl">Cities covered</div>
            </div>
            <div className="scope-stat">
              <div className="scope-val">{scope.total.toLocaleString()}</div>
              <div className="scope-lbl">Total restaurants</div>
            </div>
            <div className="scope-stat">
              <div className="scope-val">{scope.open_count.toLocaleString()}</div>
              <div className="scope-lbl">Currently open</div>
            </div>
            <div className="scope-stat">
              <div className="scope-val">{scope.delivery_count.toLocaleString()}</div>
              <div className="scope-lbl">Delivery-enabled</div>
            </div>
          </div>
          <div className="scope-notes">
            <p><strong>Date range:</strong> {scope.date_note}</p>
            <p><strong>Delivery-only:</strong> {scope.delivery_note}</p>
            <p><strong>Urban/Rural:</strong> Classified by restaurant density per city —
              Urban ≥ 500 restaurants, Suburban ≥ 100, Rural &lt; 100.
              Larger metros (Philadelphia, Tucson, Nashville…) are well-represented;
              very small towns may be undersampled.</p>
            <p><strong>Geographic scope:</strong> Primarily USA and Canada, with some international entries.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: '#22c55e', label: '4.5 – 5.0 ★' },
    { color: '#86efac', label: '4.0 – 4.5 ★' },
    { color: '#facc15', label: '3.5 – 4.0 ★' },
    { color: '#fb923c', label: '3.0 – 3.5 ★' },
    { color: '#f87171', label: '2.0 – 3.0 ★' },
    { color: '#ef4444', label: '< 2.0 ★' },
  ]
  return (
    <div className="legend">
      <div className="legend-title">Rating</div>
      {items.map(({ color, label }) => (
        <div key={label} className="legend-item">
          <span className="legend-dot" style={{ background: color }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RestaurantMap() {
  const [rawData, setRawData]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [tooltip, setTooltip]     = useState({ item: null, pos: null })
  const mapContainerRef           = useRef(null)

  const [filters, setFilters] = useState({
    city:        '',
    cuisines:    [],
    prices:      [],
    densities:   [],
    openOnly:    false,
    deliveryOnly: false,
  })

  // Load data
  useEffect(() => {
    fetch('/restaurants.json')
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json() })
      .then(d => { setRawData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  // Filtered dataset
  const filtered = useMemo(() => {
    if (!rawData) return []
    let list = rawData.restaurants

    if (filters.city)
      list = list.filter(r => r.city === filters.city)
    if (filters.cuisines.length)
      list = list.filter(r => filters.cuisines.includes(r.cuisine))
    if (filters.prices.length)
      list = list.filter(r => filters.prices.includes(r.price))
    if (filters.densities.length)
      list = list.filter(r => filters.densities.includes(r.density))
    if (filters.openOnly)
      list = list.filter(r => r.open === 1)
    if (filters.deliveryOnly)
      list = list.filter(r => r.delivery)

    // When showing everything, cap at MAX_DISPLAY sorted by review_count
    if (list.length > MAX_DISPLAY) {
      list = [...list].sort((a, b) => b.reviews - a.reviews).slice(0, MAX_DISPLAY)
    }

    return list
  }, [rawData, filters])

  const handleHover = useCallback((item, pos) => setTooltip({ item, pos }), [])
  const handleLeave = useCallback(() => setTooltip({ item: null, pos: null }), [])

  if (loading) return (
    <div className="map-loading">
      <div className="spinner" />
      <p>Loading 67k restaurants…</p>
    </div>
  )
  if (error) return <div className="map-error">Error: {error}</div>

  const totalCount = rawData.restaurants.length
  const shownCount = filtered.length === MAX_DISPLAY && rawData.restaurants.length > MAX_DISPLAY
    ? `${MAX_DISPLAY.toLocaleString()} (top by reviews)`
    : filtered.length

  return (
    <div className="rsm-root">
      <header className="rsm-header">
        <div className="rsm-title">
          <h1>Restaurant Success Map</h1>
          <p className="rsm-subtitle">
            Geographic scatter of {rawData.restaurants.length.toLocaleString()} restaurants
            from the Yelp Academic Dataset — colored by rating, sized by zoom level.
          </p>
        </div>
      </header>

      <div className="rsm-body">
        <FilterPanel
          meta={rawData.meta}
          filters={filters}
          onChange={setFilters}
          total={totalCount}
          shown={filtered.length > MAX_DISPLAY ? MAX_DISPLAY : filtered.length}
        />

        <div className="map-wrapper" ref={mapContainerRef}>
          {filtered.length > MAX_DISPLAY && !filters.city && (
            <div className="cap-notice">
              Showing top {MAX_DISPLAY.toLocaleString()} by review count. Filter by city to see all.
            </div>
          )}
          <MapContainer
            center={[37.5, -96]}
            zoom={4}
            style={{ width: '100%', height: '100%' }}
            preferCanvas
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ScatterLayer
              data={filtered}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          </MapContainer>

          <Legend />

          <Tooltip
            item={tooltip.item}
            pos={tooltip.pos}
            mapRef={mapContainerRef}
          />
        </div>
      </div>

      <ScopePanel scope={rawData.scope} />
    </div>
  )
}
