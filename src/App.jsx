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
          title="The Crowded Marketplace"
          teaser="58,000+ independent restaurants across 18 US states — Philadelphia leads every city in the dataset."
        />
        <USOverview restaurants={data?.restaurants} />

        {/* Geographic map — where do they cluster and close? */}
        <ChapterDivider
          num={2}
          title="Where Restaurants Thrive — and Disappear"
          teaser="1 in 3 PA & NJ restaurants has permanently closed. Where are they?"
        />
        <section id="map-section">
          <MapSection data={data} loading={loading} error={error} />
        </section>

        {/* Cuisine breakdown */}
        <ChapterDivider
          num={3}
          title="The Restaurant Landscape"
          teaser="Which cuisine types dominate? The answer shapes every other analysis."
        />
        <CuisineChart restaurants={data?.restaurants} />

        {/* Rating sweet spot */}
        <ChapterDivider
          num={4}
          title="The Rating Sweet Spot"
          teaser="More reviews don't always mean better ratings — and better ratings don't always mean survival."
        />
        <section id="sweet-spot">
          <SweetSpotScatter restaurants={data?.restaurants} />
        </section>

        {/* Survival factors model */}
        <ChapterDivider
          num={5}
          title="What Predicts Survival"
          teaser="Analysing 16 factors across 18,244 restaurants: delivery is the #1 predictor, outranking stars by 3×."
        />
        <SurvivalFactors />

        {/* Amenities */}
        <ChapterDivider
          num={6}
          title="Hidden Signals of Success"
          teaser="Delivery, seating, and WiFi — which extras actually predict whether a restaurant survives?"
        />
        <section id="amenities" className="amenity-wrapper">
          <AmenityAssociationPage />
        </section>

        {/* Review language */}
        <ChapterDivider
          num={7}
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
