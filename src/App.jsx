import { useState, useEffect } from 'react'
import Nav                    from './components/Nav'
import Hero                   from './components/Hero'
import IntroSection           from './components/IntroSection'
import MapSection             from './components/MapSection'
import SweetSpotScatter          from './SweetSpotScatter'
import ReviewLanguageExplorer    from './ReviewLanguageExplorer'
import AmenityAssociationPage from './amenities'
import RadarSection           from './components/RadarSection'
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
        {/* Section 1 — Hero */}
        <Hero />

        {/* Section 2 — Intro / The Challenge */}
        <IntroSection />

        {/* Section 3 — Restaurant Success Map */}
        <MapSection data={data} loading={loading} error={error} />

        {/* Section 3 — Sweet Spot Explorer (Monica's implementation) */}
        <section id="sweet-spot">
          <SweetSpotScatter restaurants={data?.restaurants} />
        </section>

        {/* Section 4 — Amenity Association Explorer (Jenna's implementation) */}
        <section id="amenities" className="amenity-wrapper">
          <AmenityAssociationPage />
        </section>

        {/* Section 5 — Restaurant Profiles (radar / spider plots) */}
        <RadarSection />

        {/* Section 6 — Review Language Explorer */}
        <ReviewLanguageExplorer />
      </main>
    </>
  )
}
