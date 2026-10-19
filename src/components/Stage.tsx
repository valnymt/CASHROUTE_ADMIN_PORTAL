import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { linkTargets } from '../routes'

const W = 1440
const H = 900

/**
 * Renders a Figma frame at its native 1440x900 size, scaled to fit the
 * window, and turns the frame's prototype hotspots ("link:<key> ..." layer
 * names) into in-app navigation.
 */
export default function Stage({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const onClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-name^="link:"]')
    if (!el) return
    const key = el.getAttribute('data-name')!.slice('link:'.length).split(' ')[0]
    const to = linkTargets[key]
    if (to) {
      e.preventDefault()
      navigate(to)
    } else {
      console.warn(`No screen mapped for prototype link "${key}"`)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div style={{ width: W * scale, height: H * scale }}>
        <div
          onClick={onClick}
          className="relative overflow-hidden"
          style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
