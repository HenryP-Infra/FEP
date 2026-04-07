import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import StateCountySearch from './StateCountySearch'
import PermitsPanel from './PermitsPanel'
import './CountyMap.css'

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── FIPS → state abbreviation ────────────────────────────────────────────────
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

// Terrain tile only
const TERRAIN = {
  url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
  attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
  maxZoom: 20,
}

const COUNTY_GEOJSON_URL =
  'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json'

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

// ── Map helpers (must live inside MapContainer) ──────────────────────────────
function TileLayerUpdater() {
  const map = useMap()
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) {
      ref.current = L.tileLayer(TERRAIN.url, {
        attribution: TERRAIN.attribution,
        maxZoom: TERRAIN.maxZoom,
      }).addTo(map)
    }
    return () => { ref.current?.remove(); ref.current = null }
  }, [map])
  return null
}

function MapController({ flyTo, flyToBounds }) {
  const map = useMap()
  flyTo.current = (latlng, zoom = 10) =>
    map.flyTo(latlng, zoom, { duration: 1.0 })
  flyToBounds.current = (bounds) =>
    map.flyToBounds(bounds, { padding: [60, 60], duration: 1.0 })
  return null
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CountyMap() {
  const [countyData, setCountyData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [selectedStateFips, setSelectedStateFips] = useState(null)
  const [selectedCounty, setSelectedCounty] = useState(null) // { name, stateAbbr }

  const flyToRef = useRef(null)
  const flyToBoundsRef = useRef(null)
  const selectedLayerRef = useRef(null)
  const layersRef = useRef({}) // "fips::name" → Leaflet layer

  // Load GeoJSON once
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
        console.error(err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Shared selection logic ────────────────────────────────────────────────
  const applySelection = useCallback((layer, name, stateAbbr) => {
    if (selectedLayerRef.current && selectedLayerRef.current !== layer) {
      selectedLayerRef.current.setStyle(defaultStyle())
    }
    if (layer) {
      layer.setStyle(selectedStyle())
      layer.bringToFront()
      selectedLayerRef.current = layer
      flyToBoundsRef.current?.(layer.getBounds())
    }
    setSelectedCounty({ name, stateAbbr })
  }, [])

  // ── GeoJSON feature binding ───────────────────────────────────────────────
  const handleEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.NAME || ''
    const fips = feature.properties?.STATE || ''
    const stateAbbr = FIPS_TO_STATE[fips] || fips

    layersRef.current[`${fips}::${name}`] = layer

    layer.on({
      click() {
        setSelectedStateFips(fips)
        applySelection(layer, name, stateAbbr)
      },
    })

    layer.bindTooltip(`${name} County, ${stateAbbr}`, {
      sticky: true,
      className: 'county-tooltip',
    })
  }, [applySelection])

  // ── Dropdown county selection ─────────────────────────────────────────────
  const handleCountySelect = useCallback(({ name, stateFips, stateAbbr }) => {
    const layer = layersRef.current[`${stateFips}::${name}`]
    applySelection(layer, name, stateAbbr)
    setSelectedCounty({ name, stateAbbr })
  }, [applySelection])

  return (
    <div className="map-wrapper">
      {/* ── Top bar ── */}
      <div className="map-header">
        <span className="map-title">US County Map</span>
        <StateCountySearch
          countyData={countyData}
          selectedStateFips={selectedStateFips}
          selectedCountyName={selectedCounty?.name}
          onStateChange={setSelectedStateFips}
          onCountySelect={handleCountySelect}
        />
      </div>

      {loadError && <div className="map-error">{loadError}</div>}

      {/* ── Map ── */}
      <div className="map-body">
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          className="leaflet-map"
          zoomControl={true}
        >
          <MapController flyTo={flyToRef} flyToBounds={flyToBoundsRef} />
          <TileLayerUpdater />
          {countyData && (
            <GeoJSON
              key="counties"
              data={countyData}
              style={defaultStyle}
              onEachFeature={handleEachFeature}
            />
          )}
        </MapContainer>

        {!countyData && !loadError && (
          <div className="map-loading">Loading county boundaries…</div>
        )}
      </div>

      {/* ── Permits panel (shown once a county is selected) ── */}
      {selectedCounty && <PermitsPanel county={selectedCounty} />}
    </div>
  )
}
