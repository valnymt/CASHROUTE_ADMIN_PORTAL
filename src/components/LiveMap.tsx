import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LiveTrip, LiveTripLocation } from '@/services/types'
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);

// Keep the three colors in sync with the Android TripMapScreen.
const MAP_COLORS = { route: '#2563eb', pickup: '#15803d', dropoff: '#dc2626' }

function stopPopup(label: string, location: LiveTripLocation) {
    const content = document.createElement('div')
    const title = document.createElement('strong')
    title.className = 'block pr-3 text-[13px] text-plum'
    title.textContent = label + ' · ' + (location.name ?? 'Handover stop')
    content.append(title)
    for (const value of [location.address, location.contactName]) {
        if (!value) continue
        const row = document.createElement('p')
        row.className = 'mt-1 text-[12px] text-ink-60'
        row.textContent = value
        content.append(row)
    }
    const phone = location.contactPhone?.replace(/[^+\d]/g, '')
    if (phone && /^\+?\d+$/.test(phone)) {
        const call = document.createElement('a')
        call.href = 'tel:' + phone
        call.className = 'mt-2 inline-block text-[12px] font-semibold text-violet underline'
        call.textContent = 'Call ' + location.contactPhone
        content.append(call)
    }
    return new maplibregl.Popup({ offset: 25 }).setDOMContent(content)
}
type LiveMapProps = {
    trips?: LiveTrip[]
    selectedTrip?: LiveTrip | null
    traveledPath: [number, number][]
}

export default function LiveMap({ trips = [], selectedTrip = null, traveledPath }: LiveMapProps) {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<maplibregl.Marker[]>([])
    const vehicleMarkersRef = useRef(new Map<string, maplibregl.Marker>())

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

            vehicleMarkersRef.current.forEach((marker) => marker.remove())
            vehicleMarkersRef.current.clear()

            map.remove()
            mapRef.current = null
        }
    }, [])

    // Place vehicle markers at the latest coordinates sent by the device.
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

            marker.setLngLat(target)
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

        const pickupMarker = new maplibregl.Marker({ color: MAP_COLORS.pickup })
            .setLngLat([pickupLng, pickupLat])
            .setPopup(stopPopup('Pickup', pickup))
            .addTo(map)

        const dropoffMarker = new maplibregl.Marker({ color: MAP_COLORS.dropoff })
            .setLngLat([dropoffLng, dropoffLat])
            .setPopup(stopPopup('Drop-off', dropoff))
            .addTo(map)

        markersRef.current = [pickupMarker, dropoffMarker]

        return () => {
            pickupMarker.remove()
            dropoffMarker.remove()
            markersRef.current = []
        }
    }, [selectedTripId, pickupLat, pickupLng, dropoffLat, dropoffLng])
    const originLng = selectedTrip?.currentLongitude ?? pickupLng
    const originLat = selectedTrip?.currentLatitude ?? pickupLat
    const routeKey = selectedTripId ? [originLng, originLat, dropoffLng, dropoffLat].join(',') : ''

    // GPS samples stay independent of whichever road route the router recommends.
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        const draw = () => {
            const source = ensureLine(map, 'traveled-gps', '#7c3aed', false)
            source.setData(lineData(traveledPath))
        }
        if (map.isStyleLoaded()) draw()
        else map.once('load', draw)
        return () => { map.off('load', draw) }
    }, [traveledPath])

    useEffect(() => {
        const map = mapRef.current
        if (!map || !selectedTripId || pickupLng == null || pickupLat == null || dropoffLng == null || dropoffLat == null) return
        const points = [pickupLng, pickupLat, dropoffLng, dropoffLat].map(Number)
        if (!points.every(Number.isFinite)) return
        map.fitBounds([[points[0], points[1]], [points[2], points[3]]], { padding: 80, maxZoom: 14 })
    }, [selectedTripId, pickupLng, pickupLat, dropoffLng, dropoffLat])

    // Recompute the suggested remainder when a new GPS position comes in.
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        const controller = new AbortController()
        let timeout: ReturnType<typeof setTimeout> | undefined
        const draw = async () => {
            const source = ensureLine(map, 'suggested-route', MAP_COLORS.route, true)
            source.setData(lineData([]))
            const endpoints = routeKey.split(',')
            if (endpoints.length !== 4 || endpoints.some(value => !value || !Number.isFinite(Number(value)))) return
            const [lng, lat, destinationLng, destinationLat] = endpoints
            const url = 'https://router.project-osrm.org/route/v1/driving/' +
                [lng, lat].join(',') + ';' + [destinationLng, destinationLat].join(',') + '?overview=full&geometries=geojson'
            timeout = setTimeout(() => controller.abort(), 8_000)
            try {
                const response = await fetch(url, { signal: controller.signal })
                if (!response.ok) return
                const result = await response.json()
                const coordinates = result.routes?.[0]?.geometry?.coordinates
                if (!controller.signal.aborted && result.code === 'Ok' && Array.isArray(coordinates)) {
                    source.setData(lineData(coordinates))
                }
            } catch {
                // The recorded GPS trail is still shown when the router is unavailable.
            } finally {
                clearTimeout(timeout)
            }
        }
        if (map.isStyleLoaded()) void draw()
        else map.once('load', draw)
        return () => {
            controller.abort()
            clearTimeout(timeout)
            map.off('load', draw)
        }
    }, [routeKey])

    return (
        <div
            ref={mapContainer}
            style={{ width: '100%', height: '100%', minHeight: 600 }}
        />
    )
}
function lineData(coordinates: [number, number][]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
    return {
        type: 'FeatureCollection',
        features: coordinates.length < 2 ? [] : [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates },
        }],
    }
}

function ensureLine(map: maplibregl.Map, id: string, color: string, dashed: boolean) {
    const source = map.getSource<maplibregl.GeoJSONSource>(id)
    if (source) return source
    map.addSource(id, { type: 'geojson', data: lineData([]) })
    map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': color, 'line-width': dashed ? 4 : 5, ...(dashed ? { 'line-dasharray': [2, 2] } : {}) },
    }, dashed && map.getLayer('traveled-gps') ? 'traveled-gps' : undefined)
    return map.getSource<maplibregl.GeoJSONSource>(id)!
}
