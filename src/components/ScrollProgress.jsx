import { useEffect, useState } from 'react'

export default function ScrollProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setPct(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        width: `${pct}%`,
        background: 'linear-gradient(to right, #d32323, #ff6b6b)',
        zIndex: 9999,
        transition: 'width 0.05s linear',
        transformOrigin: 'left',
        pointerEvents: 'none',
      }}
    />
  )
}
