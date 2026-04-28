import { useRef, useState, useEffect } from 'react'
import './ContextSection.css'

const QUESTIONS = [
  { num: '01', q: 'Where do restaurants cluster — and where do they close?',  hint: 'Mapped across PA & NJ by rating and survival status' },
  { num: '02', q: 'Which cuisine types are most prevalent in the region?',     hint: 'Independent restaurant landscape, no franchise chains' },
  { num: '03', q: 'What\'s the sweet spot between ratings and review volume?', hint: 'The relationship between stars, traffic, and longevity' },
  { num: '04', q: 'Which amenities actually predict survival?',                hint: 'Twelve features scored on survival rate via logistic regression' },
  { num: '05', q: 'What language do guests use at different quality tiers?',   hint: 'Distinctive review words by star bucket, cuisine, and city' },
]

// Plate cloche icon — clearly reads as restaurant
function RestaurantIcon({ active }) {
  return (
    <svg viewBox="0 0 40 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg"
      className={`ctx-waffle-icon${active ? ' ctx-waffle-icon--active' : ''}`}>
      {/* Dome */}
      <path d="M3 18 C3 7 37 7 37 18Z"/>
      {/* Plate rim */}
      <rect x="1" y="18" width="38" height="5" rx="2.5"/>
      {/* Little handle on top of dome */}
      <rect x="17" y="4" width="6" height="4" rx="2"/>
    </svg>
  )
}

function WaffleChart({ total = 10, failPct = 0.61 }) {
  const failCount = Math.round(total * failPct)
  return (
    <div className="ctx-waffle">
      <div className="ctx-waffle-grid">
        {Array.from({ length: total }, (_, i) => (
          <RestaurantIcon key={i} active={i >= failCount} />
        ))}
      </div>
      <div className="ctx-waffle-legend">
        <span className="ctx-waffle-dot ctx-waffle-dot--fail" />
        <span>Failed (61%)</span>
        <span className="ctx-waffle-dot ctx-waffle-dot--open" />
        <span>Survived (39%)</span>
        <span className="ctx-waffle-note">1 icon = 10% of restaurants</span>
      </div>
    </div>
  )
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

export default function ContextSection() {
  const [ref, inView] = useInView(0.1)

  const fade = (delay = 0) => ({
    opacity:    inView ? 1 : 0,
    transform:  inView ? 'none' : 'translateY(18px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  })

  return (
    <section id="context" className="ctx" ref={ref}>
      <div className="ctx-inner">

        {/* Left: narrative */}
        <div className="ctx-left">
          <div className="ctx-eyebrow" style={fade(0)}>The Industry</div>

          <h2 className="ctx-headline" style={fade(60)}>
            America's second-largest private employer — and one of the riskiest sectors to enter.
          </h2>

          <p className="ctx-body" style={fade(120)}>
            The restaurant industry employs 15.7 million people and contributes over 5% of US nominal GDP.
            Yet the odds are stacked against new entrants: <strong>61% of restaurants fail within their first three years</strong>,
            and 9 in 10 of those are small businesses — independent operators without the safety nets of
            franchise systems.
          </p>

          {/* Waffle infographic */}
          <div style={fade(180)}>
            <WaffleChart total={10} failPct={0.61} />
          </div>

          <p className="ctx-body" style={fade(240)}>
            The question is: what separates the survivors? Previous research suggests Yelp ratings are
            a powerful signal — not just of customer satisfaction, but of revenue potential.
          </p>

          <div className="ctx-quote" style={fade(290)}>
            <div className="ctx-quote-mark">"</div>
            <p className="ctx-quote-text">
              A one-star increase in Yelp ratings leads to a 5–9% increase in revenue.
              The effect is driven entirely by <em>independent</em> restaurants — chains are unaffected.
              This makes Yelp scores a powerful predictor of success for new indie restaurants.
            </p>
            <div className="ctx-quote-cite">— Luca, 2016 · Harvard Business School Working Paper</div>
          </div>

          <div className="ctx-sources" style={{ ...fade(330), marginTop: 4 }}>
            <p className="ctx-source">¹ Auguste Escoffier School (2025). <em>Why restaurants fail.</em></p>
            <p className="ctx-source">² Luca, M. (2016). <em>Reviews, Reputation, and Revenue.</em> HBS Working Paper 12-016.</p>
            <p className="ctx-source">³ Yelp Open Academic Dataset (PA &amp; NJ subset, ~2022 snapshot)</p>
          </div>
        </div>

        {/* Right: big stats + research questions */}
        <div className="ctx-right">

          {/* 3 big headline stats */}
          <div className="ctx-big-stats" style={fade(100)}>
            <div className="ctx-big-stat">
              <div className="ctx-big-val">15.7<span className="ctx-big-unit">M</span></div>
              <div className="ctx-big-label">industry workers</div>
              <div className="ctx-big-sub">2nd largest private employer</div>
            </div>
            <div className="ctx-big-stat">
              <div className="ctx-big-val">&gt;5<span className="ctx-big-unit">%</span></div>
              <div className="ctx-big-label">of US nominal GDP</div>
              <div className="ctx-big-sub">$1.1 trillion in annual sales</div>
            </div>
            <div className="ctx-big-stat ctx-big-stat--highlight">
              <div className="ctx-big-val ctx-big-val--red">9<span className="ctx-big-unit">/10</span></div>
              <div className="ctx-big-label">are small businesses</div>
              <div className="ctx-big-sub">Independent, not chains or franchises</div>
            </div>
          </div>

          <div className="ctx-q-label" style={fade(320)}>What this study answers</div>

          <div className="ctx-questions">
            {QUESTIONS.map(({ num, q, hint }, i) => (
              <div
                key={num}
                className="ctx-q-row"
                style={fade(360 + i * 60)}
              >
                <span className="ctx-q-num">{num}</span>
                <div className="ctx-q-text">
                  <span className="ctx-q-q">{q}</span>
                  <span className="ctx-q-hint">{hint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
