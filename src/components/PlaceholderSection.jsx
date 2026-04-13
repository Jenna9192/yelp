import './PlaceholderSection.css'

const SECTIONS = [
  {
    id:       'sweet-spot',
    number:   '02',
    title:    'Sweet Spot Explorer',
    subtitle: 'Find the optimal combination of price, cuisine, and location for maximum ratings',
    description:
      'An interactive scatter plot that lets you dial in two variables at once — ' +
      'price tier vs. rating, review count vs. check-ins, city vs. cuisine — ' +
      'and instantly see where high-performers cluster. Identify the "sweet spot" ' +
      'that predicts restaurant success across different markets.',
    chartType: 'Scatter / Bubble Chart',
    chartIcon: (
      <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="55" r="8"  fill="#d32323" opacity="0.25" stroke="#d32323" strokeWidth="1.5"/>
        <circle cx="55" cy="35" r="14" fill="#d32323" opacity="0.2"  stroke="#d32323" strokeWidth="1.5"/>
        <circle cx="80" cy="20" r="6"  fill="#d32323" opacity="0.3"  stroke="#d32323" strokeWidth="1.5"/>
        <circle cx="95" cy="48" r="10" fill="#d32323" opacity="0.18" stroke="#d32323" strokeWidth="1.5"/>
        <circle cx="42" cy="62" r="5"  fill="#d32323" opacity="0.28" stroke="#d32323" strokeWidth="1.5"/>
        <circle cx="68" cy="42" r="12" fill="#d32323" opacity="0.22" stroke="#d32323" strokeWidth="1.5"/>
        <line x1="10" y1="72" x2="110" y2="72" stroke="#ddd" strokeWidth="1.5"/>
        <line x1="10" y1="72" x2="10"  y2="8"  stroke="#ddd" strokeWidth="1.5"/>
      </svg>
    ),
    filters: ['X axis', 'Y axis', 'Bubble size', 'City filter', 'Min reviews'],
  },
  {
    id:       'amenities',
    number:   '03',
    title:    'Amenity Association Explorer',
    subtitle: 'Discover which features — parking, WiFi, outdoor seating — correlate with higher ratings',
    description:
      'A heatmap and association matrix revealing how business attributes relate ' +
      'to star ratings, review volume, and check-in frequency. See whether ' +
      'offering WiFi or accepting reservations meaningfully predicts success, ' +
      'and how these relationships vary by cuisine type and price tier.',
    chartType: 'Heatmap / Association Matrix',
    chartIcon: (
      <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {[0,1,2,3,4].map(row =>
          [0,1,2,3,4,5].map(col => {
            const intensity = Math.abs(Math.sin((row * 7 + col * 3) * 0.9))
            return (
              <rect
                key={`${row}-${col}`}
                x={14 + col * 17}
                y={8  + row * 14}
                width="15" height="12" rx="2"
                fill="#d32323"
                opacity={0.1 + intensity * 0.65}
              />
            )
          })
        )}
      </svg>
    ),
    filters: ['Amenity type', 'Cuisine', 'Price tier', 'Min businesses', 'Metric'],
  },
  {
    id:       'reviews',
    number:   '04',
    title:    'Review Language Explorer',
    subtitle: 'Analyze the words and phrases that distinguish 5-star reviews from 1-star ones',
    description:
      'A word frequency and sentiment explorer that surfaces the language ' +
      'patterns across rating tiers. Compare term frequency across star levels, ' +
      'explore which adjectives appear most in glowing vs. critical reviews, ' +
      'and filter by cuisine type to see whether the vocabulary of success ' +
      'varies between a sushi bar and a burger joint.',
    chartType: 'Word Cloud / Bar Chart',
    chartIcon: (
      <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {[
          { x: 18, y: 28, w: 32, h: 10, o: 0.85 },
          { x: 18, y: 42, w: 22, h: 10, o: 0.55 },
          { x: 18, y: 56, w: 40, h: 10, o: 0.7  },
          { x: 18, y: 14, w: 18, h: 10, o: 0.4  },
          { x: 68, y: 28, w: 26, h: 10, o: 0.5  },
          { x: 68, y: 42, w: 36, h: 10, o: 0.75 },
          { x: 68, y: 56, w: 16, h: 10, o: 0.35 },
          { x: 68, y: 14, w: 28, h: 10, o: 0.6  },
        ].map(({ x, y, w, h, o }, i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="4"
            fill="#d32323" opacity={o} />
        ))}
        <line x1="10" y1="72" x2="110" y2="72" stroke="#ddd" strokeWidth="1.5"/>
      </svg>
    ),
    filters: ['Star rating', 'Cuisine', 'Min frequency', 'Sentiment', 'Date range'],
  },
]

export default function PlaceholderSections() {
  return (
    <>
      {SECTIONS.map(({ id, number, title, subtitle, description, chartType, chartIcon, filters }) => (
        <section key={id} id={id} className="placeholder-section">
          {/* Section header — matches MapSection style */}
          <div className="ph-header">
            <div className="ph-header-left">
              <span className="ph-number">{number}</span>
              <div>
                <h2 className="ph-title">{title}</h2>
                <p className="ph-subtitle">{subtitle}</p>
              </div>
            </div>
            <span className="ph-badge">Coming soon</span>
          </div>

          {/* Body */}
          <div className="ph-body">
            {/* Fake filter panel */}
            <aside className="ph-filters">
              <div className="ph-filters-label">Filters</div>
              {filters.map(f => (
                <div key={f} className="ph-filter-item">
                  <div className="ph-filter-bar" style={{ width: `${45 + Math.random() * 40}%` }} />
                  <span>{f}</span>
                </div>
              ))}
              <div className="ph-filter-placeholder-note">
                Controls will appear here once this explorer is built.
              </div>
            </aside>

            {/* Chart placeholder */}
            <div className="ph-chart-area">
              <div className="ph-chart-inner">
                <div className="ph-chart-preview">
                  {chartIcon}
                </div>
                <div className="ph-chart-meta">
                  <div className="ph-chart-type">{chartType}</div>
                  <p className="ph-chart-desc">{description}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  )
}
