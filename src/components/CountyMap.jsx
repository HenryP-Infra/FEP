import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import AddressSearch from './AddressSearch'
import LayerControl from './LayerControl'
import './CountyMap.css'

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const TILE_LAYERS = {
  satellite: {
    label: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
    maxZoom: 20,
  },
  terrain: {
    label: 'Terrain',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
    maxZoom: 20,
  },
}

const COUNTY_GEOJSON_URL =
  'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json'

function countyStyle() {
  return {
    fillColor: '#4a90e2',
    fillOpacity: 0.08,
    color: '#2563eb',
    weight: 0.5,
    opacity: 0.6,
  }
}

function highlightStyle() {
  return {
    fillColor: '#2563eb',
    fillOpacity: 0.3,
    color: '#1d4ed8',
    weight: 2,
    opacity: 1,
  }
}

function MapController({ flyTo }) {
  const map = useMap()
  flyTo.current = (latlng, zoom = 10) => {
    map.flyTo(latlng, zoom, { duration: 1.2 })
  }
  return null
}

function SearchMarker({ position, markerRef }) {
  const map = useMap()

  useEffect(() => {
    const marker = L.marker(position, { title: 'Search result' }).addTo(map)
    markerRef.current = marker
    return () => {
      marker.remove()
      markerRef.current = null
    }
  }, [map, position, markerRef])

  return null
}

export default function CountyMap() {
  const [activeLayer, setActiveLayer] = useState('satellite')
  const [countyData, setCountyData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [hoveredCounty, setHoveredCounty] = useState(null)
  const [markerPosition, setMarkerPosition] = useState(null)
  const flyToRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(COUNTY_GEOJSON_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) setCountyData(data)
      } catch (err) {
        if (!cancelled) setLoadError('Failed to load county data. Please refresh.')
        console.error('County GeoJSON load error:', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.NAME || 'Unknown County'
    const state = feature.properties?.STATE || ''

    layer.on({
      mouseover(e) {
        e.target.setStyle(highlightStyle())
        e.target.bringToFront()
        setHoveredCounty({ name, state })
      },
      mouseout(e) {
        e.target.setStyle(countyStyle())
        setHoveredCounty(null)
      },
      click(e) {
        const center = e.target.getBounds().getCenter()
        if (flyToRef.current) {
          flyToRef.current([center.lat, center.lng], 9)
        }
      },
    })

    layer.bindTooltip(name, {
      sticky: true,
      className: 'county-tooltip',
    })
  }, [])

  const handleAddressFound = useCallback(({ latlng }) => {
    setMarkerPosition(latlng)
    if (flyToRef.current) {
      flyToRef.current(latlng, 12)
    }
  }, [])

  const layer = TILE_LAYERS[activeLayer]

  return (
    <div className="map-wrapper">
      <div className="map-header">
        <h1 className="map-title">US County Map</h1>
        <div className="map-controls">
          <AddressSearch onAddressFound={handleAddressFound} />
          <LayerControl
            layers={TILE_LAYERS}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
          />
        </div>
      </div>

      {loadError && <div className="map-error">{loadError}</div>}

      {hoveredCounty && (
        <div className="county-info">
          {hoveredCounty.name}
          {hoveredCounty.state ? `, State FIPS: ${hoveredCounty.state}` : ''}
        </div>
      )}

      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        className="leaflet-container"
        zoomControl={true}
      >
        <MapController flyTo={flyToRef} />

        <TileLayer
          key={activeLayer}
          url={layer.url}
          attribution={layer.attribution}
          maxZoom={layer.maxZoom}
        />

        {countyData && (
          <GeoJSON
            key="counties"
            data={countyData}
            style={countyStyle}
            onEachFeature={handleEachFeature}
          />
        )}

        {markerPosition && (
          <SearchMarker
            position={markerPosition}
            markerRef={markerRef}
          />
        )}
      </MapContainer>

      {!countyData && !loadError && (
        <div className="map-loading">Loading county boundaries...</div>
      )}
    </div>
  )
}
