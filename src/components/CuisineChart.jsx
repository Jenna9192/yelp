import { useRef, useState, useEffect, useMemo } from 'react'
import './CuisineChart.css'

// Color palette for cuisine bars
const PALETTE = [
  '#d32323', '#e8623a', '#f0944a', '#e8b84b',
  '#6aab6a', '#4a9e8e', '#4a7fc1', '#7a6bc4',
  '#b05ab0', '#c0627a', '#888780', '#5a5855',
]

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

export default function CuisineChart({ restaurants }) {
  const [ref, inView] = useInView(0.1)

  const cuisineData = useMemo(() => {
    if (!restaurants?.length) return []
    const counts = {}
    for (const r of restaurants) {
      const c = r.cuisine || 'Other'
      counts[c] = (counts[c] || 0) + 1
    }
    return Object.entries(counts)
      .filter(([name]) => name !== 'Other')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, n], i) => ({ name, n, color: PALETTE[i % PALETTE.length] }))
  }, [restaurants])

  const maxN    = cuisineData[0]?.n || 1
  const topName = cuisineData[0]?.name || '—'
  const topN    = cuisineData[0]?.n || 0

  // Survival by cuisine from top 3
  const survivalData = useMemo(() => {
    if (!restaurants?.length) return []
    const byC = {}
    for (const r of restaurants) {
      const c = r.cuisine || 'Other'
      if (!byC[c]) byC[c] = { open: 0, total: 0 }
      byC[c].total++
      if (r.open === 1) byC[c].open++
    }
    return Object.entries(byC)
      .filter(([c]) => c !== 'Other' && byC[c].total >= 100)
      .map(([c, d]) => ({ name: c, rate: d.open / d.total, n: d.total }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3)
  }, [restaurants])

  const fade = (delay = 0) => ({
    opacity:    inView ? 1 : 0,
    transform:  inView ? 'none' : 'translateY(16px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  })

  return (
    <section id="cuisine" className="cuisine" ref={ref}>
      <div className="cuisine-inner">

        <div className="cuisine-header">
          <div className="cuisine-eyebrow" style={fade(0)}>The Landscape</div>
          <h2 className="cuisine-headline" style={fade(60)}>
            What types of restaurants dominate the region?
          </h2>
          <p className="cuisine-subhead" style={fade(120)}>
            Breaking down 18,244 independent restaurants in PA &amp; NJ by cuisine type —
            excluding national franchise chains to focus on small-business operators.
          </p>
        </div>

        <div className="cuisine-layout">

          {/* Animated bar chart */}
          <div className="cuisine-bars" style={fade(180)}>
            {cuisineData.map(({ name, n, color }, i) => (
              <div key={name} className="cuisine-bar-row">
                <div className="cuisine-bar-label">{name}</div>
                <div className="cuisine-bar-track">
                  <div
                    className="cuisine-bar-fill"
                    style={{
                      '--bar-delay': `${220 + i * 55}ms`,
                      width:  inView ? `${(n / maxN) * 100}%` : '0%',
                      background: color,
                    }}
                  />
                </div>
                <div className="cuisine-bar-n">{n.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Callout panel */}
          <div className="cuisine-callout" style={fade(260)}>
            <div className="cuisine-callout-label">Quick stats</div>

            <div className="cuisine-callout-stat">
              <div className="cuisine-callout-n" style={{ color: PALETTE[0] }}>
                {topName}
              </div>
              <div className="cuisine-callout-desc">
                Most common cuisine in PA &amp; NJ — {topN.toLocaleString()} restaurants
              </div>
            </div>

            {survivalData.length > 0 && (
              <div className="cuisine-callout-stat">
                <div className="cuisine-callout-n">
                  {Math.round(survivalData[0].rate * 100)}%
                </div>
                <div className="cuisine-callout-desc">
                  survival rate for {survivalData[0].name} restaurants —
                  highest of any major cuisine category
                </div>
              </div>
            )}

            <div className="cuisine-callout-stat">
              <div className="cuisine-callout-n" style={{ color: '#555' }}>
                {cuisineData.length}
              </div>
              <div className="cuisine-callout-desc">
                distinct cuisine categories tracked in the dataset
              </div>
            </div>

            <div className="cuisine-note">
              National franchise chains (McDonald's, Subway, Starbucks, etc.) have been
              removed. All 18,244 restaurants here are independent small businesses.
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
