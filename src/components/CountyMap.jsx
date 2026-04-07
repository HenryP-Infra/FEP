import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import StateCountySearch, { US_STATES } from './StateCountySearch'
import PermitsPanel from './PermitsPanel'
import PermitMarkers from './PermitMarkers'
import { generatePermits } from '../utils/permitData'
import './CountyMap.css'

// Fix Leaflet default marker icon paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// FIPS code → state abbreviation
const FIPS_TO_ABBR = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
  '10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL',
  '18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD',
  '25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
  '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND',
  '39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
  '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
  '55':'WI','56':'WY','72':'PR','78':'VI',
}

const COUNTY_GEOJSON_URL =
  'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json'

// Map styles
const defaultStyle = () => ({
  fillColor:   '#4a90e2',
  fillOpacity: 0.05,
  color:       '#2563eb',
  weight:      0.4,
  opacity:     0.5,
})

const selectedStyle = () => ({
  fillColor:   '#3b82f6',
  fillOpacity: 0.22,
  color:       '#ffffff',
  weight:      2.5,
  opacity:     1,
})

// ── Terrain tile layer (inside MapContainer) ─────────────────────────────────
function TerrainLayer() {
  const map    = useMap()
  const tileRef = useRef(null)

  useEffect(() => {
    tileRef.current = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
      { attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>', maxZoom: 20 },
    ).addTo(map)
    return () => { tileRef.current?.remove(); tileRef.current = null }
  }, [map])

  return null
}

// ── Sync flyToBounds ref (must be inside MapContainer) ───────────────────────
function MapController({ flyToBoundsRef }) {
  const map = useMap()
  flyToBoundsRef.current = useCallback(
    (bounds) => map.flyToBounds(bounds, { padding: [60, 60], duration: 0.9 }),
    [map],
  )
  return null
}

// ── Map legend (absolute overlay) ───────────────────────────────────────────
function MapLegend() {
  return (
    <div className="map-legend">
      <div className="legend-title">Permit Markers</div>
      <div className="legend-row"><span className="legend-dot" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} />SUP – Approved/Expired</div>
      <div className="legend-row"><span className="legend-dot legend-dot--hollow" style={{ borderColor: '#3b82f6' }} />SUP – Pending</div>
      <div className="legend-row"><span className="legend-dot" style={{ background: '#f97316', borderColor: '#f97316' }} />CUP – Approved/Expired</div>
      <div className="legend-row"><span className="legend-dot legend-dot--hollow" style={{ borderColor: '#f97316' }} />CUP – Pending</div>
      <div className="legend-row"><span className="legend-dot legend-dot--denied" style={{ borderColor: '#6b7280' }} />Denied</div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CountyMap() {
  // Raw GeoJSON
  const [countyData, setCountyData]   = useState(null)
  const [loadError, setLoadError]     = useState(null)

  // Search panel state
  const [selectedStateFips, setSelectedStateFips] = useState(null)
  const [pendingCounties, setPendingCounties]       = useState([])   // in dropdown

  // What's actually rendered on the map + permits panel
  const [activeCounties, setActiveCounties] = useState([])

  // Refs
  const flyToBoundsRef     = useRef(null)
  const layersRef          = useRef({})   // "fips::name" → Leaflet layer
  const centersRef         = useRef({})   // "fips::name" → [lat, lon]
  const activeKeysRef      = useRef(new Set())

  // ── Load GeoJSON once ─────────────────────────────────────────────────────
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

  // ── Generate permits for active counties ──────────────────────────────────
  const permits = useMemo(() => {
    return activeCounties.flatMap(c => {
      const key    = `${c.stateFips}::${c.name}`
      const center = centersRef.current[key] ?? null
      return generatePermits(c.name, c.stateAbbr, center)
    })
  }, [activeCounties])

  // ── Apply/remove map highlight when activeCounties changes ────────────────
  useEffect(() => {
    if (!countyData) return   // layers not bound yet — skip; will re-run after bind

    const newKeys = new Set(activeCounties.map(c => `${c.stateFips}::${c.name}`))

    // Remove highlight from counties that left
    activeKeysRef.current.forEach(key => {
      if (!newKeys.has(key)) layersRef.current[key]?.setStyle(defaultStyle())
    })

    // Apply highlight and compute combined bounds
    let combined = null
    newKeys.forEach(key => {
      const layer = layersRef.current[key]
      if (!layer) return
      layer.setStyle(selectedStyle())
      layer.bringToFront()
      const b = layer.getBounds()
      combined = combined ? combined.extend(b) : b
    })

    activeKeysRef.current = newKeys

    if (combined && flyToBoundsRef.current) {
      flyToBoundsRef.current(combined)
    }
  }, [activeCounties, countyData])

  // ── GeoJSON feature binding ───────────────────────────────────────────────
  const handleEachFeature = useCallback((feature, layer) => {
    const name      = feature.properties?.NAME  ?? ''
    const fips      = feature.properties?.STATE ?? ''
    const stateAbbr = FIPS_TO_ABBR[fips] ?? fips
    const key       = `${fips}::${name}`

    layersRef.current[key] = layer

    // Store centroid (for permit coordinate generation)
    const bounds = layer.getBounds()
    const center = bounds.getCenter()
    centersRef.current[key] = [center.lat, center.lng]

    // Re-apply active style if this county is already active (GeoJSON re-render)
    if (activeKeysRef.current.has(key)) {
      layer.setStyle(selectedStyle())
      layer.bringToFront()
    }

    layer.on({
      click() {
        // Map click: immediately activate just this county (bypasses Run)
        const county = { name, stateFips: fips, stateAbbr }
        setSelectedStateFips(fips)
        setPendingCounties([county])
        setActiveCounties([county])
      },
    })

    layer.bindTooltip(`${name} County, ${stateAbbr}`, {
      sticky: true,
      className: 'county-tooltip',
    })
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStateChange = useCallback((fips) => {
    setSelectedStateFips(fips)
    setPendingCounties([])
  }, [])

  const handleCountiesChange = useCallback((counties) => {
    setPendingCounties(counties)
  }, [])

  const handleRun = useCallback(() => {
    setActiveCounties([...pendingCounties])
  }, [pendingCounties])

  const showLegend = activeCounties.length > 0

  return (
    <div className="map-wrapper">
      {/* ── App header ── */}
      <div className="map-header">
        <div className="map-title-block">
          <span className="map-title">County Terrain &amp; Permit Viewer</span>
        </div>
        <StateCountySearch
          countyData={countyData}
          selectedStateFips={selectedStateFips}
          selectedCounties={pendingCounties}
          onStateChange={handleStateChange}
          onCountiesChange={handleCountiesChange}
          onRun={handleRun}
        />
      </div>

      {loadError && <div className="map-error">{loadError}</div>}

      {/* ── Terrain map ── */}
      <div className="map-body">
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          className="leaflet-map"
          zoomControl={true}
        >
          <MapController flyToBoundsRef={flyToBoundsRef} />
          <TerrainLayer />
          {countyData && (
            <GeoJSON
              key="counties"
              data={countyData}
              style={defaultStyle}
              onEachFeature={handleEachFeature}
            />
          )}
          {permits.length > 0 && <PermitMarkers permits={permits} />}
        </MapContainer>

        {!countyData && !loadError && (
          <div className="map-loading">Loading county boundaries…</div>
        )}

        {showLegend && <MapLegend />}
      </div>

      {/* ── Permits panel ── */}
      {activeCounties.length > 0 && (
        <PermitsPanel counties={activeCounties} permits={permits} />
      )}
    </div>
  )
}
