import { useState, useEffect } from 'react'
import Nav                    from './components/Nav'
import Hero                   from './components/Hero'
import IntroSection           from './components/IntroSection'
import ChapterDivider         from './components/ChapterDivider'
import MapSection             from './components/MapSection'
import SweetSpotScatter       from './SweetSpotScatter'
import AmenityAssociationPage from './amenities'
import RadarSection           from './components/RadarSection'
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

        {/* Hero — cinematic opening */}
        <Hero />

        {/* The Challenge */}
        <IntroSection />

        {/* Chapter 01 — The Crowded Marketplace */}
        <ChapterDivider
          num={1}
          title="The Crowded Marketplace"
          teaser="Success begins with context — where are restaurants thriving, and where are they disappearing?"
        />
        <section id="map-section">
          <MapSection data={data} loading={loading} error={error} />
        </section>

        {/* Chapter 02 — The Rating Sweet Spot */}
        <ChapterDivider
          num={2}
          title="The Rating Myth"
          teaser="Do higher ratings always mean greater success? The answer will surprise you."
        />
        <section id="sweet-spot">
          <SweetSpotScatter restaurants={data?.restaurants} />
        </section>

        {/* Chapter 03 — Hidden Signals */}
        <ChapterDivider
          num={3}
          title="Hidden Signals of Success"
          teaser="Success may come from experience design, not just food quality."
        />
        <section id="amenities" className="amenity-wrapper">
          <AmenityAssociationPage />
        </section>

        {/* Chapter 04 — The Fingerprint */}
        <ChapterDivider
          num={4}
          title="The Restaurant Fingerprint"
          teaser="What multi-dimensional profile separates crowd favorites from the rest?"
        />
        <RadarSection />

        {/* Chapter 05 — What Reviews Reveal */}
        <ChapterDivider
          num={5}
          title="What Reviews Reveal"
          teaser="Restaurants stand out in language before they stand out in ratings."
        />
        <ReviewLanguageExplorer />

        {/* Finale — The Success Formula */}
        <ChapterDivider
          num={6}
          title="The Success Formula"
          teaser="Six chapters of signals, distilled into one conclusion."
        />
        <Finale />

      </main>
    </>
  )
}
