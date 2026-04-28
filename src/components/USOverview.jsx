import { useRef, useState, useEffect, useMemo } from 'react'
import './USOverview.css'

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

const PANJ_STATES = new Set(['PA', 'NJ'])

export default function USOverview({ restaurants }) {
  const [ref, inView] = useInView(0.1)
  const [usData, setUsData] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}us_overview.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUsData(d) })
      .catch(() => {})
  }, [])

  // PA/NJ stats from restaurants.json (franchise-filtered)
  const panjStats = useMemo(() => {
    if (!restaurants?.length) return null
    const open = restaurants.filter(r => r.open === 1).length
    return {
      total:    restaurants.length,
      closed:   restaurants.length - open,
      open,
    }
  }, [restaurants])

  const topCities = usData?.top_cities?.slice(0, 12) ?? []
  const maxN      = topCities[0]?.n ?? 1

  const fade = (delay = 0) => ({
    opacity:    inView ? 1 : 0,
    transform:  inView ? 'none' : 'translateY(16px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  })

  const total = usData?.total?.toLocaleString() ?? '58,000+'

  return (
    <section id="overview" className="uso" ref={ref}>
      <div className="uso-inner">

        <div className="uso-header">
          <div className="uso-eyebrow" style={fade(0)}>The Dataset</div>
          <h2 className="uso-headline" style={fade(60)}>
            58,000+ independent restaurants across the US.
          </h2>
          <p className="uso-subhead" style={fade(120)}>
            The Yelp Academic Dataset covers restaurants across 18 states and regions.
            We focus on <strong>Pennsylvania and New Jersey</strong> — because Philadelphia alone
            is the single most-represented city in the entire dataset, making PA &amp; NJ
            the richest region for analysis.
          </p>
        </div>

        {/* Full dataset stat strip */}
        <div className="uso-stats-row" style={fade(180)}>
          {[
            { val: usData ? usData.total.toLocaleString() : '58,160', label: 'Restaurants', context: 'Independent only · full Yelp dataset' },
            { val: '18',      label: 'States & regions', context: 'US + Canadian provinces' },
            { val: '6.99M',   label: 'Reviews',          context: 'Across all locations' },
            { val: '11M',     label: 'Check-ins',        context: 'Verified visits' },
          ].map(({ val, label, context }) => (
            <div key={label} className="uso-stat">
              <div className="uso-stat-val">{val}</div>
              <div className="uso-stat-label">{label}</div>
              <div className="uso-stat-context">{context}</div>
            </div>
          ))}
        </div>

        <div className="uso-grid">

          {/* Top cities bar chart — full US */}
          <div className="uso-chart-block" style={fade(240)}>
            <div className="uso-chart-title">
              Top cities by independent restaurant count — full US dataset
              <span className="uso-chart-legend">
                <span className="uso-chart-legend-dot uso-chart-legend-dot--red" /> PA &amp; NJ
                <span className="uso-chart-legend-dot uso-chart-legend-dot--grey" style={{marginLeft:10}} /> Other states
              </span>
            </div>
            <div className="uso-bars">
              {topCities.map(({ city, state, n }, i) => {
                const isPaNj = PANJ_STATES.has(state)
                return (
                  <div key={`${city}-${state}`} className="uso-bar-row">
                    <div className={`uso-bar-city ${isPaNj ? 'uso-bar-city--highlight' : ''}`}>
                      {city}
                      <span className="uso-bar-state">, {state}</span>
                    </div>
                    <div className="uso-bar-track">
                      <div
                        className={`uso-bar-fill ${isPaNj ? 'uso-bar-fill--highlight' : 'uso-bar-fill--dim'}`}
                        style={{
                          '--bar-delay': `${280 + i * 45}ms`,
                          width: inView ? `${(n / maxN) * 100}%` : '0%',
                        }}
                      />
                    </div>
                    <div className="uso-bar-n">{n.toLocaleString()}</div>
                  </div>
                )
              })}
            </div>
            <div className="uso-chart-note">
              Philadelphia leads all US cities in the dataset — nearly 2× the next largest city.
              PA &amp; NJ combined account for the largest single-region cluster.
            </div>
          </div>

          {/* Right: closure callout + PA/NJ focus */}
          <div className="uso-right">

            {/* 1-in-3 closure card */}
            <div className="uso-closure-card" style={fade(300)}>
              <div className="uso-icons">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`uso-rest-icon ${i === 2 ? 'uso-rest-icon--closed' : ''}`}>
                    <div className={`uso-rest-icon-dot ${i === 2 ? 'uso-rest-icon-dot--closed' : 'uso-rest-icon-dot--open'}`}>
                      🍽️
                    </div>
                    <div className="uso-rest-icon-lbl">{i === 2 ? 'closed' : 'open'}</div>
                  </div>
                ))}
              </div>
              <div className="uso-closure-label">
                1 in 3 restaurants in PA &amp; NJ permanently closed
              </div>
              <div className="uso-closure-sub">
                {panjStats
                  ? `${panjStats.closed.toLocaleString()} of ${panjStats.total.toLocaleString()} independent restaurants show is_open = 0 — they never reopened. That's a ${Math.round((panjStats.closed / panjStats.total) * 100)}% closure rate.`
                  : '6,112 of 18,244 independent restaurants never reopened — a 33.5% closure rate.'
                }
              </div>
            </div>

            {/* PA/NJ focus card */}
            <div className="uso-focus-card" style={fade(360)}>
              <div className="uso-focus-label">Our study · Pennsylvania &amp; New Jersey</div>
              <div className="uso-focus-val">
                {panjStats ? panjStats.total.toLocaleString() : '18,244'}{' '}
                <span>restaurants</span>
              </div>
              <div className="uso-focus-row">
                {[
                  { n: '1.4M',  l: 'Reviews' },
                  { n: '2.4M',  l: 'Check-ins' },
                  { n: panjStats ? panjStats.closed.toLocaleString() : '6,112', l: 'Closed' },
                ].map(({ n, l }) => (
                  <div key={l} className="uso-focus-stat">
                    <div className="uso-focus-stat-n">{n}</div>
                    <div className="uso-focus-stat-l">{l}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
