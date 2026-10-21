/**
 * Address ↔ coordinates lookup using OpenStreetMap's Nominatim service.
 * Free, no API key; keep calls infrequent (the branch form debounces typing).
 * Swap for Google/Mapbox geocoding later by changing only this file.
 */

const BASE = 'https://nominatim.openstreetmap.org'

interface NominatimAddress {
  house_number?: string
  road?: string
  neighbourhood?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  state?: string
  postcode?: string
  country?: string
}

/** "238 Orchard Road, Orchard, Singapore 238851" — short form for the address field. */
function formatAddress(a: NominatimAddress, fallback: string) {
  const street = [a.house_number, a.road].filter(Boolean).join(' ')
  const area = a.suburb ?? a.neighbourhood
  const city = a.city ?? a.town ?? a.village ?? a.state
  const parts = [street, area, [city, a.postcode].filter(Boolean).join(' ')].filter(Boolean)
  return parts.length ? parts.join(', ') : fallback
}

/** Address text → coordinates (first match), or null if nothing was found. */
export async function geocodeAddress(query: string, signal?: AbortSignal): Promise<{ lat: number; lng: number } | null> {
  const url = `${BASE}/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Address lookup failed (${res.status})`)
  const [hit] = (await res.json()) as { lat: string; lon: string }[]
  return hit ? { lat: +(+hit.lat).toFixed(5), lng: +(+hit.lon).toFixed(5) } : null
}

/** Coordinates → readable street address, or null if the spot has no address. */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  const url = `${BASE}/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Address lookup failed (${res.status})`)
  const json = (await res.json()) as { display_name?: string; address?: NominatimAddress; error?: string }
  if (json.error || !json.address) return null
  return formatAddress(json.address, json.display_name ?? '')
}
