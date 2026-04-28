import { useState, useEffect, useRef } from 'react'
import './SurvivalFactors.css'

const FEATURE_META = {
  delivery:         { label: 'Offers delivery',        icon: '🛵', desc: 'The single strongest predictor of survival. Restaurants on delivery platforms stay visible even when foot traffic drops — a modern lifeline.' },
  log_reviews:      { label: 'Review volume',          icon: '⭐', desc: 'More reviews = more visibility. Restaurants that accumulate reviews faster survive longer, regardless of their average rating.' },
  has_tv:           { label: 'Has TVs',                icon: '📺', desc: 'Restaurants with TVs attract repeat visitors for sports and events — driving consistent foot traffic and check-ins.' },
  stars:            { label: 'Star rating',            icon: '⭐', desc: 'Better ratings help, but stars alone are a weak predictor. Visibility and amenities outperform raw quality scores.' },
  log_checkins:     { label: 'Yelp check-ins',         icon: '📍', desc: 'Check-in activity signals an engaged, repeat customer base — one of the clearest behavioral predictors of survival.' },
  bike_parking:     { label: 'Bike parking',           icon: '🚲', desc: 'A proxy for accessible, walkable urban locations. Restaurants in bike-friendly areas benefit from foot traffic and community loyalty.' },
  density_rural:    { label: 'Rural location',         icon: '🌿', desc: 'Rural restaurants face less competition and often build stronger community ties, giving them a modest survival edge.' },
  density_suburban: { label: 'Suburban location',      icon: '🏘️', desc: 'Suburban restaurants benefit from lower rents and loyal neighborhood regulars compared to dense urban markets.' },
  good_for_groups:  { label: 'Group-friendly',         icon: '👥', desc: 'Group-oriented venues show lower survival — possibly due to higher overhead, event dependency, and margin pressure.' },
  reservations:     { label: 'Takes reservations',     icon: '📅', desc: 'Reservation-based restaurants are more vulnerable to no-shows and disruption. Walk-in traffic shows more resilience.' },
  good_for_kids:    { label: 'Kid-friendly',           icon: '👶', desc: 'Family-oriented restaurants face higher operational demands and lower margins, correlating with slightly higher closure rates.' },
  outdoor_seating:  { label: 'Outdoor seating',        icon: '☀️', desc: 'Outdoor seating slightly correlates with closure — possibly reflecting temporary setups that didn\'t outlast seasonal conditions.' },
}

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

export default function SurvivalFactors() {
  const [model, setModel]     = useState(null)
  const [hovered, setHovered] = useState(null)
  const [sectionRef, inView]  = useInView(0.1)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}survival_model.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setModel(d) })
      .catch(() => {})
  }, [])

  const features = model?.feature_importance
    ?.filter(f => FEATURE_META[f.feature])
    ?.sort((a, b) => b.pct_change - a.pct_change)
    ?? []

  const maxAbs = Math.max(...features.map(f => Math.abs(f.pct_change)), 1)

  const positives = features.filter(f => f.pct_change > 0)
  const negatives = features.filter(f => f.pct_change < 0)

  const fade = (delay = 0) => ({
    opacity:    inView ? 1 : 0,
    transform:  inView ? 'none' : 'translateY(20px)',
    transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
  })

  return (
    <section id="survival-factors" className="sf" ref={sectionRef}>
      <div className="sf-inner">

        <div className="sf-header" style={fade(0)}>
          <div className="sf-eyebrow">Logistic Regression · 18,244 restaurants</div>
          <h2 className="sf-headline">What actually predicts whether a restaurant survives?</h2>
          <p className="sf-sub">
            We ran a logistic regression across 16 features — from delivery and amenities to location density.
            The results challenge common assumptions. <strong>Hover any factor</strong> to learn more.
          </p>
        </div>

        <div className="sf-layout" style={fade(120)}>

          {/* Diverging bar chart */}
          <div className="sf-chart">
            <div className="sf-chart-head">
              <span className="sf-chart-neg-label">← Hurts survival</span>
              <span className="sf-chart-axis-label">Impact on survival odds</span>
              <span className="sf-chart-pos-label">Helps survival →</span>
            </div>
            <div className="sf-chart-axis" />

            <div className="sf-bars">
              {features.map((f, i) => {
                const meta    = FEATURE_META[f.feature] ?? { label: f.feature, desc: '' }
                const pct     = f.pct_change
                const isPos   = pct >= 0
                const barW    = `${(Math.abs(pct) / maxAbs) * 44}%`
                const isHov   = hovered?.feature === f.feature

                return (
                  <div
                    key={f.feature}
                    className={`sf-row${isHov ? ' sf-row--hov' : ''}`}
                    onMouseEnter={() => setHovered(f)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ '--delay': `${i * 35}ms`, opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateX(-10px)', transition: `opacity 0.5s ease ${120 + i * 35}ms, transform 0.5s ease ${120 + i * 35}ms` }}
                  >
                    <div className="sf-row-label">{meta.label}</div>
                    <div className="sf-row-bars">
                      <div className="sf-bar-neg-side">
                        {!isPos && (
                          <div className="sf-bar sf-bar--neg" style={{ width: barW }} />
                        )}
                      </div>
                      <div className="sf-bar-center" />
                      <div className="sf-bar-pos-side">
                        {isPos && (
                          <div className="sf-bar sf-bar--pos" style={{ width: barW }} />
                        )}
                      </div>
                    </div>
                    <div className={`sf-row-pct sf-row-pct--${isPos ? 'pos' : 'neg'}`}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="sf-detail">
            {hovered ? (
              <>
                <div className="sf-detail-icon">{FEATURE_META[hovered.feature]?.icon ?? '•'}</div>
                <div className="sf-detail-name">{FEATURE_META[hovered.feature]?.label ?? hovered.feature}</div>
                <div className={`sf-detail-badge sf-detail-badge--${hovered.pct_change >= 0 ? 'pos' : 'neg'}`}>
                  {hovered.pct_change >= 0 ? '+' : ''}{hovered.pct_change.toFixed(1)}% survival odds
                </div>
                <p className="sf-detail-desc">{FEATURE_META[hovered.feature]?.desc}</p>
                <div className="sf-detail-meta">
                  <div className="sf-detail-meta-row">
                    <span>Coefficient</span>
                    <span>{hovered.coef.toFixed(4)}</span>
                  </div>
                  <div className="sf-detail-meta-row">
                    <span>Odds ratio</span>
                    <span>{hovered.odds_ratio.toFixed(3)}×</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="sf-detail-placeholder">
                <div className="sf-detail-placeholder-icon">↙</div>
                <p>Hover a factor on the chart to see its impact and why it predicts survival.</p>
              </div>
            )}
          </div>

        </div>

        {/* Bottom callout */}
        <div className="sf-callout" style={fade(300)}>
          <div className="sf-callout-stat">+29%</div>
          <div className="sf-callout-body">
            <strong>Delivery is the #1 signal</strong> — restaurants offering delivery show 29% higher survival odds,
            outranking star ratings by nearly 3×. Visibility beats quality as the top predictor.
          </div>
        </div>

      </div>
    </section>
  )
}
