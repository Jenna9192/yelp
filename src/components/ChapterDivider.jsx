import { useRef, useState, useEffect } from 'react'
import './ChapterDivider.css'

export default function ChapterDivider({ num, title, teaser, icon }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold: 0.3 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="chap" ref={ref}>
      <div className={`chap-inner ${inView ? 'chap-inner--in' : ''}`}>
        <div className="chap-rule" />
        <div className="chap-center">
          {icon && <div className="chap-icon" aria-hidden="true">{icon}</div>}
          <span className="chap-num">{String(num).padStart(2, '0')}</span>
          <h2 className="chap-title">{title}</h2>
          {teaser && <p className="chap-teaser">{teaser}</p>}
        </div>
        <div className="chap-rule" />
      </div>
    </div>
  )
}
