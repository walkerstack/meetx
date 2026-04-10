import { useState, useEffect, useRef } from 'react'

/**
 * useTimer — counts up from 0 in seconds.
 * Returns formatted string like "05:42" or "1:02:15"
 */
export function useTimer() {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(ref.current)
  }, [])

  const format = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  return { seconds, formatted: format(seconds) }
}
