import { useState, useEffect } from 'react'
import Nav                    from './components/Nav'
import Hero                   from './components/Hero'
import ContextSection         from './components/ContextSection'
import ChapterDivider         from './components/ChapterDivider'
import USOverview             from './components/USOverview'
import MapSection             from './components/MapSection'
import CuisineChart           from './components/CuisineChart'
import SweetSpotScatter       from './SweetSpotScatter'
import SurvivalFactors        from './SurvivalFactors'
import AmenityAssociationPage from './amenities'
import ReviewLanguageExplorer from './ReviewLanguageExplorer'
import Finale                 from './components/Finale'
import ScrollProgress         from './components/ScrollProgress'
import './App.css'

const sw = { strokeWidth: '1.4', strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
  storefront: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  ),
  mapPin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  utensils: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
      <path d="M3 2v7c0 1.1.9 2 2 2 1.1 0 2-.9 2-2V2"/>
      <line x1="5" y1="11" x2="5" y2="22"/>
      <line x1="18" y1="2" x2="18" y2="22"/>
      <path d="M15 7.5C15 4.5 17 2 18 2s3 2.5 3 5.5a2.5 2.5 0 0 1-2.5 2.5h-1A2.5 2.5 0 0 1 15 7.5z"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  ),
  pulse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <path d="M16 8h4l3 5v3h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <line x1="8" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="12" y2="14"/>
    </svg>
  ),
}

export default function App() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}restaurants.json`)
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <>
      <ScrollProgress />
      <Nav />
      <main>

        {/* Hero — light, split-layout, PA/NJ dot map */}
        <Hero />

        {/* Industry context + research backing */}
        <ContextSection />

        {/* Dataset overview — US stats + PA/NJ cities bar chart + closure callout */}
        <ChapterDivider
          num={1}
          icon={ICONS.storefront}
          title="The Crowded Marketplace"
          teaser="58,000+ independent restaurants across 18 US states — Philadelphia leads every city in the dataset."
        />
        <USOverview restaurants={data?.restaurants} />

        {/* Geographic map — where do they cluster and close? */}
        <ChapterDivider
          num={2}
          icon={ICONS.mapPin}
          title="Where Restaurants Thrive — and Disappear"
          teaser="1 in 3 PA & NJ restaurants has permanently closed. Where are they?"
        />
        <section id="map-section">
          <MapSection data={data} loading={loading} error={error} />
        </section>

        {/* Cuisine breakdown */}
        <ChapterDivider
          num={3}
          icon={ICONS.utensils}
          title="The Restaurant Landscape"
          teaser="Which cuisine types dominate? The answer shapes every other analysis."
        />
        <CuisineChart restaurants={data?.restaurants} />

        {/* Rating sweet spot */}
        <ChapterDivider
          num={4}
          icon={ICONS.star}
          title="The Rating Sweet Spot"
          teaser="More reviews don't always mean better ratings — and better ratings don't always mean survival."
        />
        <section id="sweet-spot">
          <SweetSpotScatter restaurants={data?.restaurants} />
        </section>

        {/* Survival factors model */}
        <ChapterDivider
          num={5}
          icon={ICONS.pulse}
          title="What Predicts Survival"
          teaser="Analysing 16 factors across 18,244 restaurants: delivery is the #1 predictor, outranking stars by 3×."
        />
        <SurvivalFactors />

        {/* Amenities */}
        <ChapterDivider
          num={6}
          icon={ICONS.truck}
          title="Hidden Signals of Success"
          teaser="Delivery, seating, and WiFi — which extras actually predict whether a restaurant survives?"
        />
        <section id="amenities" className="amenity-wrapper">
          <AmenityAssociationPage />
        </section>

        {/* Review language */}
        <ChapterDivider
          num={7}
          icon={ICONS.message}
          title="What Reviews Reveal"
          teaser="The language guests use changes dramatically between 1-star and 5-star experiences."
        />
        <ReviewLanguageExplorer />

        {/* Finale */}
        <Finale />

      </main>
    </>
  )
}
