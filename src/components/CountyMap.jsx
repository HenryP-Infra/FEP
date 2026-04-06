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

// ── FIPS → state abbreviation ───────────────────────────────────────────────
const FIPS_TO_STATE = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
  '10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL',
  '18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD',
  '25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
  '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND',
  '39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
  '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
  '55':'WI','56':'WY','72':'PR','78':'VI',
}

// ── Tile layers ─────────────────────────────────────────────────────────────
const TILE_LAYERS = {
  roadmap: {
    label: 'Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
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

// ── Style functions ──────────────────────────────────────────────────────────
const defaultStyle = () => ({
  fillColor: '#4a90e2',
  fillOpacity: 0.08,
  color: '#2563eb',
  weight: 0.5,
  opacity: 0.6,
})

const selectedStyle = () => ({
  fillColor: '#3b82f6',
  fillOpacity: 0.25,
  color: '#000000',
  weight: 2.5,
  opacity: 1,
})

// ── Internal map helpers ─────────────────────────────────────────────────────
function TileLayerUpdater({ url, attribution, maxZoom }) {
  const map = useMap()
  const tileRef = useRef(null)

  useEffect(() => {
    if (!tileRef.current) {
      tileRef.current = L.tileLayer(url, { attribution, maxZoom }).addTo(map)
    } else {
      tileRef.current.setUrl(url)
    }
  }, [map, url, attribution, maxZoom])

  useEffect(() => {
    return () => { tileRef.current?.remove() }
  }, [])

  return null
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
    return () => { marker.remove(); markerRef.current = null }
  }, [map, position, markerRef])
  return null
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CountyMap() {
  const [activeLayer, setActiveLayer] = useState('roadmap')
  const [countyData, setCountyData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [selectedCounty, setSelectedCounty] = useState(null)
  const [markerPosition, setMarkerPosition] = useState(null)
  const flyToRef = useRef(null)
  const markerRef = useRef(null)
  const selectedLayerRef = useRef(null)

  // Load county GeoJSON once
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
    const fips = feature.properties?.STATE || ''
    const stateAbbr = FIPS_TO_STATE[fips] || fips

    layer.on({
      click(e) {
        // Deselect previous county
        if (selectedLayerRef.current && selectedLayerRef.current !== e.target) {
          selectedLayerRef.current.setStyle(defaultStyle())
        }
        // Apply persistent selection style
        e.target.setStyle(selectedStyle())
        e.target.bringToFront()
        selectedLayerRef.current = e.target

        setSelectedCounty({ name, stateAbbr })

        const center = e.target.getBounds().getCenter()
        flyToRef.current?.([center.lat, center.lng], 9)
      },
    })

    layer.bindTooltip(`${name} County, ${stateAbbr}`, {
      sticky: true,
      className: 'county-tooltip',
    })
  }, [])

  const handleAddressFound = useCallback(({ latlng }) => {
    setMarkerPosition(latlng)
    flyToRef.current?.(latlng, 12)
  }, [])

  const handleClosePanel = () => {
    if (selectedLayerRef.current) {
      selectedLayerRef.current.setStyle(defaultStyle())
      selectedLayerRef.current = null
    }
    setSelectedCounty(null)
  }

  const layer = TILE_LAYERS[activeLayer]

  return (
    <div className="map-wrapper">
      {/* ── Top bar ── */}
      <div className="map-header">
        <span className="map-title">US County Map</span>
        <AddressSearch onAddressFound={handleAddressFound} />
        <LayerControl
          layers={TILE_LAYERS}
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
        />
      </div>

      {loadError && <div className="map-error">{loadError}</div>}

      {/* ── Map + side panel ── */}
      <div className="map-body">
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          className="leaflet-map"
          zoomControl={true}
          // no key — MapContainer is stable; only the tile URL changes
        >
          <MapController flyTo={flyToRef} />

          {/* Use imperative tile layer so switching URL never resets the viewport */}
          <TileLayerUpdater
            url={layer.url}
            attribution={layer.attribution}
            maxZoom={layer.maxZoom}
          />

          {countyData && (
            <GeoJSON
              key="counties"
              data={countyData}
              style={defaultStyle}
              onEachFeature={handleEachFeature}
            />
          )}

          {markerPosition && (
            <SearchMarker position={markerPosition} markerRef={markerRef} />
          )}
        </MapContainer>

        {/* ── County info panel ── */}
        {selectedCounty && (
          <div className="county-panel">
            <button className="county-panel-close" onClick={handleClosePanel} aria-label="Close">
              ×
            </button>
            <div className="county-panel-label">Selected County</div>
            <div className="county-panel-name">{selectedCounty.name}</div>
            <div className="county-panel-state">{selectedCounty.stateAbbr}</div>
          </div>
        )}
      </div>

      {!countyData && !loadError && (
        <div className="map-loading">Loading county boundaries…</div>
      )}
    </div>
  )
}
