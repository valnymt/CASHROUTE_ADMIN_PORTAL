import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const round = (n: number) => +n.toFixed(5)
/** Yangon city centre — fallback start point. */
const YANGON: L.LatLngTuple = [16.8409, 96.1735]
/** Myanmar's outline (with a little margin): the map can't be panned away from it. */
const MYANMAR = L.latLngBounds([9.4, 92.0], [28.7, 101.3])
const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

/** Branch pin: plum dot with a white ring, centred on the coordinate. */
const pinIcon = L.divIcon({
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html:
    '<div style="width:24px;height:24px;border-radius:9999px;background:#421869;border:4px solid #fff;' +
    'box-shadow:0 2px 10px rgba(66,24,105,.45);cursor:grab"></div>',
})

/**
 * Street map (OpenStreetMap tiles via Leaflet) for placing a branch.
 * Drag the pin or click the map to move it; the circle is the handover
 * geo-fence in metres. Typing coordinates outside moves the pin too.
 */
export default function MapPinPicker({
  lat,
  lng,
  radius,
  onChange,
}: {
  lat: number
  lng: number
  radius: number
  onChange: (lat: number, lng: number) => void
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const circle = useRef<L.Circle | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Create the map once.
  useEffect(() => {
    const start: L.LatLngTuple = valid(lat, lng) && MYANMAR.contains([lat, lng]) ? [lat, lng] : YANGON
    const m = L.map(el.current!, {
      center: start,
      zoom: 15,
      minZoom: 5,
      maxBounds: MYANMAR,
      maxBoundsViscosity: 1,
      scrollWheelZoom: false,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m)

    const c = L.circle(start, {
      radius: Number.isFinite(radius) ? radius : 150,
      color: '#721cb8',
      weight: 2,
      fillColor: '#721cb8',
      fillOpacity: 0.12,
    }).addTo(m)
    const mk = L.marker(start, { draggable: true, icon: pinIcon, keyboard: false }).addTo(m)

    mk.on('drag', () => c.setLatLng(mk.getLatLng()))
    mk.on('dragend', () => {
      const p = mk.getLatLng()
      onChangeRef.current(round(p.lat), round(p.lng))
    })
    m.on('click', (e: L.LeafletMouseEvent) => {
      mk.setLatLng(e.latlng)
      c.setLatLng(e.latlng)
      onChangeRef.current(round(e.latlng.lat), round(e.latlng.lng))
    })

    map.current = m
    marker.current = mk
    circle.current = c
    // The modal animates in; re-measure once it has its final size.
    const t = window.setTimeout(() => m.invalidateSize(), 250)
    return () => {
      window.clearTimeout(t)
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Follow coordinates typed into the form or filled from the branch directory.
  useEffect(() => {
    const m = map.current
    if (!m || !valid(lat, lng)) return
    const p = L.latLng(lat, lng)
    if (!marker.current!.getLatLng().equals(p, 1e-6)) {
      marker.current!.setLatLng(p)
      circle.current!.setLatLng(p)
    }
    if (!m.getBounds().pad(-0.1).contains(p)) m.setView(p, Math.max(m.getZoom(), 15))
  }, [lat, lng])

  useEffect(() => {
    if (Number.isFinite(radius) && radius > 0) circle.current?.setRadius(radius)
  }, [radius])

  return (
    <div
      ref={el}
      role="application"
      aria-label="Map: drag the pin or click to set the branch location"
      className="relative z-0 isolate h-[240px] w-full overflow-hidden rounded-[20px] border border-white/95 bg-ink-6 [&_.leaflet-control-attribution]:text-[9px]"
    />
  )
}
