import { useState, useEffect } from 'react'
import Nav                from './components/Nav'
import Hero               from './components/Hero'
import MapSection         from './components/MapSection'
import PlaceholderSections from './components/PlaceholderSection'
import AmenityAssociationPage from './amenities'

export default function App() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetch('/restaurants.json')
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <>
      <Nav />
      <main>
        <Hero scope={data?.scope} />
        <MapSection data={data} loading={loading} error={error} />
        <PlaceholderSections />
        <AmenityAssociationPage />
      </main>
    </>
  )
}
