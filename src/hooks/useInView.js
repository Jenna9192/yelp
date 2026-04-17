import { useEffect, useRef, useState } from 'react'

/**
 * Returns [ref, inView] — inView flips true once the element enters
 * the viewport and stays true (one-shot reveal).
 */
export function useInView(options = {}) {
  const ref    = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12, ...options }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return [ref, inView]
}
