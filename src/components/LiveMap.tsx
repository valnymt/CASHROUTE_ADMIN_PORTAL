import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LiveTrip } from '@/services/types'
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
type LiveMapProps = {
    trips?: LiveTrip[]
    selectedTrip?: LiveTrip | null
}

export default function LiveMap({ trips = [], selectedTrip = null, }: LiveMapProps) {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<maplibregl.Marker[]>([])
    const vehicleMarkersRef = useRef(new Map<string, maplibregl.Marker>())
    const animationFramesRef = useRef(new Map<string, number>())

    // Create the map once.
    useEffect(() => {
        if (!mapContainer.current) return

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '&copy; OpenStreetMap contributors',
                    },
                },
                layers: [
                    {
                        id: 'osm',
                        type: 'raster',
                        source: 'osm',
                    },
                ],
            },
            center: [96.1951, 16.8661],
            zoom: 13,
        })

        mapRef.current = map
        map.addControl(new maplibregl.NavigationControl(), 'top-right')

        return () => {
            animationFramesRef.current.forEach((frame) => cancelAnimationFrame(frame))
            animationFramesRef.current.clear()

            vehicleMarkersRef.current.forEach((marker) => marker.remove())
            vehicleMarkersRef.current.clear()

            map.remove()
            mapRef.current = null
        }
    }, [])

    // Keep vehicle markers mounted and smoothly animate them to new GPS positions.
    useEffect(() => {
        const map = mapRef.current
        if (!map) return

        const validTrips = (Array.isArray(trips) ? trips : []).filter(
            (trip) =>
                trip.currentLatitude != null &&
                trip.currentLongitude != null &&
                Number.isFinite(Number(trip.currentLatitude)) &&
                Number.isFinite(Number(trip.currentLongitude)),
        )

        const activeIds = new Set(validTrips.map((trip) => trip.id))

        // Remove markers for trips no longer returned by the API.
        for (const [id, marker] of vehicleMarkersRef.current) {
            if (!activeIds.has(id)) {
                marker.remove()
                vehicleMarkersRef.current.delete(id)

                const frame = animationFramesRef.current.get(id)
                if (frame !== undefined) cancelAnimationFrame(frame)
                animationFramesRef.current.delete(id)
            }
        }

        validTrips.forEach((trip) => {
            const target: [number, number] = [
                Number(trip.currentLongitude),
                Number(trip.currentLatitude),
            ]

            let marker = vehicleMarkersRef.current.get(trip.id)

            if (!marker) {
                marker = new maplibregl.Marker({ color: '#7c3aed' })
                    .setLngLat(target)
                    .setPopup(
                        new maplibregl.Popup({ offset: 25 }).setText(
                            `${trip.id} · ${trip.status}`,
                        ),
                    )
                    .addTo(map)

                vehicleMarkersRef.current.set(trip.id, marker)
                return
            }

            const frame = animationFramesRef.current.get(trip.id)
            if (frame !== undefined) cancelAnimationFrame(frame)

            const start = marker.getLngLat()
            const startTime = performance.now()
            const duration = 4500 // animate across most of the 5-second polling interval

            const animate = (now: number) => {
                const t = Math.min((now - startTime) / duration, 1)

                marker!.setLngLat([
                    start.lng + (target[0] - start.lng) * t,
                    start.lat + (target[1] - start.lat) * t,
                ])

                if (t < 1) {
                    animationFramesRef.current.set(
                        trip.id,
                        requestAnimationFrame(animate),
                    )
                } else {
                    animationFramesRef.current.delete(trip.id)
                }
            }

            animationFramesRef.current.set(
                trip.id,
                requestAnimationFrame(animate),
            )
        })

        // Do not call fitBounds() or flyTo() here.
    }, [trips])
    const pickupLat = selectedTrip?.pickup?.latitude
    const pickupLng = selectedTrip?.pickup?.longitude
    const dropoffLat = selectedTrip?.dropoff?.latitude
    const dropoffLng = selectedTrip?.dropoff?.longitude
    const selectedTripId = selectedTrip?.id
    // Show pickup and drop-off markers for the selected trip.
    useEffect(() => {
        const map = mapRef.current
        if (!map) return

        // Remove the previous trip's endpoint markers.
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []

        const pickup = selectedTrip?.pickup
        const dropoff = selectedTrip?.dropoff

        if (
            pickup?.latitude == null ||
            pickup?.longitude == null ||
            dropoff?.latitude == null ||
            dropoff?.longitude == null
        ) {
            return
        }

        const pickupLat = Number(pickup.latitude)
        const pickupLng = Number(pickup.longitude)
        const dropoffLat = Number(dropoff.latitude)
        const dropoffLng = Number(dropoff.longitude)

        if (
            ![pickupLat, pickupLng, dropoffLat, dropoffLng].every(Number.isFinite)
        ) {
            return
        }

        const pickupMarker = new maplibregl.Marker({ color: '#16a34a' })
            .setLngLat([pickupLng, pickupLat])
            .setPopup(new maplibregl.Popup({ offset: 25 }).setText('Pickup'))
            .addTo(map)

        const dropoffMarker = new maplibregl.Marker({ color: '#dc2626' })
            .setLngLat([dropoffLng, dropoffLat])
            .setPopup(new maplibregl.Popup({ offset: 25 }).setText('Drop-off'))
            .addTo(map)

        markersRef.current = [pickupMarker, dropoffMarker]

        return () => {
            pickupMarker.remove()
            dropoffMarker.remove()
            markersRef.current = []
        }
    }, [selectedTripId, pickupLat, pickupLng, dropoffLat, dropoffLng])
    // Draw a road-following route for the selected trip.
    useEffect(() => {
        const map = mapRef.current
        if (!map) return

        let cancelled = false
        let routeRequest: AbortController | null = null

        const drawRoute = async () => {
            const pickup = selectedTrip?.pickup
            const dropoff = selectedTrip?.dropoff

            const hasCoordinates =
                pickup?.latitude != null &&
                pickup?.longitude != null &&
                dropoff?.latitude != null &&
                dropoff?.longitude != null &&
                [pickupLat, pickupLng, dropoffLat, dropoffLng].every(Number.isFinite)

            // const source = map.getSource('selected-trip-route') as
            //     | maplibregl.GeoJSONSource
            //     | undefined

            // Clear the previous trip's route before drawing another.
            // source?.setData({
            //     type: 'FeatureCollection',
            //     features: [],
            // })

            if (!hasCoordinates) return

            routeRequest = new AbortController()

            try {
                const url =
                    `https://router.project-osrm.org/route/v1/driving/` +
                    `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}` +
                    `?overview=full&geometries=geojson`

                const response = await fetch(url, {
                    signal: routeRequest.signal,
                })

                if (!response.ok) {
                    throw new Error(`Routing request failed: ${response.status}`)
                }

                const data = await response.json()
                const coordinates = data.routes?.[0]?.geometry?.coordinates

                if (cancelled || !coordinates) return

                const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates,
                            },
                        },
                    ],
                }

                const routeSource = map.getSource('selected-trip-route') as
                    | maplibregl.GeoJSONSource
                    | undefined

                routeSource?.setData(geojson)

                const bounds = coordinates.reduce(
                    (bounds: maplibregl.LngLatBounds, coordinate: [number, number]) =>
                        bounds.extend(coordinate),
                    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
                )

                map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
            } catch (error) {
                if (!cancelled && (error as Error).name !== 'AbortError') {
                    console.error('Could not load selected trip route:', error)
                }
            }
        }

        const handleMapLoad = () => {
            if (!map.getSource('selected-trip-route')) {
                map.addSource('selected-trip-route', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: [],
                    },
                })

                map.addLayer({
                    id: 'selected-trip-route-line',
                    type: 'line',
                    source: 'selected-trip-route',
                    paint: {
                        'line-color': '#2563eb',
                        'line-width': 5,
                        'line-opacity': 0.85,
                    },
                })
            }

            void drawRoute()
        }

        if (map.isStyleLoaded()) {
            handleMapLoad()
        } else {
            map.once('load', handleMapLoad)
        }

        return () => {
            cancelled = true
            routeRequest?.abort()
            map.off('load', handleMapLoad)
        }
    }, [selectedTripId, pickupLat, pickupLng, dropoffLat, dropoffLng])
    return (
        <div
            ref={mapContainer}
            style={{ width: '100%', height: '100%', minHeight: 600 }}
        />
    )
}