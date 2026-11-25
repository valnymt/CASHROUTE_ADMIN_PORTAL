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
    routeCoordinates: [number, number][]
}

export default function LiveMap({ trips = [], selectedTrip = null, routeCoordinates }: LiveMapProps) {
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
    useEffect(() => {
        const map = mapRef.current
        if (!map || !selectedTripId || pickupLng == null || pickupLat == null || dropoffLng == null || dropoffLat == null) return
        const points = [pickupLng, pickupLat, dropoffLng, dropoffLat].map(Number)
        if (!points.every(Number.isFinite)) return
        map.fitBounds([[points[0], points[1]], [points[2], points[3]]], { padding: 80, maxZoom: 14 })
    }, [selectedTripId, pickupLng, pickupLat, dropoffLng, dropoffLat])

    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        const draw = () => ensureLine(map).setData(lineData(routeCoordinates))
        if (map.isStyleLoaded()) draw()
        else map.once('load', draw)
        return () => { map.off('load', draw) }
    }, [routeCoordinates])

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

function ensureLine(map: maplibregl.Map) {
    const id = 'live-road-route'
    const source = map.getSource<maplibregl.GeoJSONSource>(id)
    if (source) return source
    map.addSource(id, { type: 'geojson', data: lineData([]) })
    map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': MAP_COLORS.route, 'line-width': 5 },
    })
    return map.getSource<maplibregl.GeoJSONSource>(id)!
}
