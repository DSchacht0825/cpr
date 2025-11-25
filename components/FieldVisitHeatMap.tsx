'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface FieldVisit {
  id: string
  latitude: number
  longitude: number
  visit_date: string
  visit_type: string
  location_address: string
  contact_name?: string
}

interface FieldVisitHeatMapProps {
  visits: FieldVisit[]
}

export default function FieldVisitHeatMap({ visits }: FieldVisitHeatMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  // Filter to only visits with GPS coordinates
  const locationsWithGPS = visits.filter(v => v.latitude && v.longitude)

  useEffect(() => {
    if (!mapContainer.current) return

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN

    if (!accessToken || accessToken === 'your-mapbox-token-here') {
      setMapError(
        'Mapbox access token not configured. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file.'
      )
      return
    }

    mapboxgl.accessToken = accessToken

    try {
      // Default center to San Diego, CA
      const defaultCenter: [number, number] = [-117.1611, 32.7157]
      const defaultZoom = 10

      // If we have visits with GPS, center on the first one
      const center: [number, number] =
        locationsWithGPS.length > 0
          ? [locationsWithGPS[0].longitude, locationsWithGPS[0].latitude]
          : defaultCenter

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: defaultZoom,
      })

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Add markers for each location
      map.current.on('load', () => {
        if (!map.current) return

        // Create GeoJSON from visits
        const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
          type: 'FeatureCollection',
          features: locationsWithGPS.map((visit) => ({
            type: 'Feature',
            properties: {
              id: visit.id,
              date: visit.visit_date,
              type: visit.visit_type,
              address: visit.location_address,
              contact: visit.contact_name,
            },
            geometry: {
              type: 'Point',
              coordinates: [visit.longitude, visit.latitude],
            },
          })),
        }

        // Add source with clustering
        map.current?.addSource('field-visits', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        })

        // Add clustered circles
        map.current?.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'field-visits',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#06b6d4', // cyan for small clusters
              10,
              '#f59e0b', // amber for medium
              30,
              '#ef4444', // red for large
            ],
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
          },
        })

        // Add cluster count labels
        map.current?.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'field-visits',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#ffffff',
          },
        })

        // Add unclustered points
        map.current?.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'field-visits',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#0891b2',
            'circle-radius': 10,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#fff',
          },
        })

        // Add click handlers for clusters
        map.current?.on('click', 'clusters', (e) => {
          if (!map.current) return
          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ['clusters'],
          })
          const clusterId = features[0].properties?.cluster_id
          const source = map.current.getSource('field-visits') as mapboxgl.GeoJSONSource

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || !map.current) return

            const geometry = features[0].geometry
            if (geometry.type === 'Point') {
              map.current.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoom || undefined,
              })
            }
          })
        })

        // Add popup on click for unclustered points
        map.current?.on('click', 'unclustered-point', (e) => {
          if (!map.current || !e.features || e.features.length === 0) return

          const coordinates = (e.features[0].geometry as GeoJSON.Point)
            .coordinates as [number, number]
          const props = e.features[0].properties

          const formatDate = (dateStr: string) => {
            return new Date(dateStr).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          }

          const visitTypeLabel: Record<string, string> = {
            'initial-contact': 'Initial Contact',
            'follow-up': 'Follow Up',
            'property-inspection': 'Property Inspection',
            'document-collection': 'Document Collection',
          }

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <div style="min-width: 200px;">
                <p style="font-weight: 600; margin-bottom: 4px;">${visitTypeLabel[props?.type] || props?.type}</p>
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">${props?.address || 'No address'}</p>
                ${props?.contact ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Contact: ${props.contact}</p>` : ''}
                <p style="font-size: 12px; color: #9ca3af;">${formatDate(props?.date)}</p>
              </div>
            `)
            .addTo(map.current)
        })

        // Change cursor on hover
        map.current?.on('mouseenter', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current?.on('mouseleave', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = ''
        })
        map.current?.on('mouseenter', 'unclustered-point', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current?.on('mouseleave', 'unclustered-point', () => {
          if (map.current) map.current.getCanvas().style.cursor = ''
        })
      })
    } catch (error) {
      console.error('Map initialization error:', error)
      setMapError('Failed to initialize map. Please check your Mapbox configuration.')
    }

    return () => {
      map.current?.remove()
    }
  }, [locationsWithGPS])

  if (mapError) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center px-6">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-gray-600">{mapError}</p>
          <p className="text-sm text-gray-500 mt-2">
            Get a free token at{' '}
            <a
              href="https://www.mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 hover:underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (locationsWithGPS.length === 0) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-gray-600">No field visits with GPS data yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Locations will appear here as workers record field visits
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div ref={mapContainer} className="h-96 rounded-lg" />
      <p className="text-sm text-gray-600 mt-3">
        Showing {locationsWithGPS.length} field visit{locationsWithGPS.length !== 1 ? 's' : ''}{' '}
        on map. Click clusters to expand, click individual points for details.
      </p>
    </div>
  )
}
