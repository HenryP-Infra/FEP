/**
 * permitData.js
 *
 * Deterministic mock generator for Special Use Permits (SUP) and
 * Conditional Use Permits (CUP) related to infrastructure projects.
 *
 * Replace generatePermits() with a real API call when live data sources
 * are integrated (county open-data portals, state planning APIs, FERC, BLM, etc.).
 */

// ── Infrastructure project templates ────────────────────────────────────────
const PROJECTS = [
  { app: 'Large-Scale Solar Energy Facility – Ground Mount',    proj: 'Clearfield Solar Farm Phase I',         type: 'SUP' },
  { app: 'Commercial Wind Energy Conversion System',            proj: 'Ridgeline Wind Project (12 WTG)',        type: 'SUP' },
  { app: 'Natural Gas Transmission Pipeline – ROW',             proj: 'Blue Ridge Pipeline Lateral Extension',  type: 'CUP' },
  { app: '230 kV Electric Transmission Line Corridor',          proj: 'Eastern Grid Interconnect Segment B',    type: 'SUP' },
  { app: 'Wireless Telecommunications Tower – Monopole 200 ft', proj: 'Rural LTE Coverage Tower #4',            type: 'CUP' },
  { app: 'Regional Water Treatment Plant Expansion',            proj: 'Northeast WTP Capacity Upgrade',         type: 'SUP' },
  { app: 'Wastewater Treatment Facility Upgrade',               proj: 'County WWTP Phase III Expansion',        type: 'CUP' },
  { app: '115 kV Electric Substation – New Facility',           proj: 'Maple Creek Substation',                 type: 'CUP' },
  { app: 'Highway Grade Separation Structure',                  proj: 'US-40 / Rail Overpass Replacement',      type: 'SUP' },
  { app: 'Hyperscale Data Center Campus',                       proj: 'CloudVault Tier III Facility',           type: 'CUP' },
  { app: 'Aggregate Mining & Crushing Operation',               proj: 'Riverside Quarry Phase II Expansion',    type: 'SUP' },
  { app: 'Oil & Gas Horizontal Well Pad Development',           proj: 'Section 14 Multi-Well Pad',              type: 'CUP' },
  { app: 'Fiber Optic Backbone Infrastructure – Phase 2',       proj: 'County Broadband Initiative Ph2',        type: 'CUP' },
  { app: 'Railroad Intermodal Logistics Facility',              proj: 'Eastern Rail Logistics Hub',             type: 'SUP' },
  { app: 'County Road Bridge Replacement',                      proj: 'CR-218 Bridge over Elk Creek',           type: 'CUP' },
  { app: 'Battery Energy Storage System (BESS) – 200 MWh',     proj: 'Valley BESS Facility',                   type: 'SUP' },
  { app: 'Natural Gas Compressor Station – Midstream',          proj: 'Midstream Gas Compression Station A',   type: 'CUP' },
  { app: 'Petroleum Products Pipeline – Mainline Corridor',     proj: 'Southern Fuel Transport Line',           type: 'SUP' },
  { app: 'Electric Vehicle Fast-Charging Hub',                  proj: 'Interstate EV Corridor Station 7',       type: 'CUP' },
  { app: 'Pumped Hydro Energy Storage Facility',                proj: 'Highland Reservoir Pump Storage',        type: 'SUP' },
  { app: 'Distributed Solar + Storage Microgrid',               proj: 'Rural Resilience Microgrid Program',     type: 'CUP' },
  { app: 'Stormwater Detention & Conveyance Infrastructure',    proj: 'Regional Flood Control Improvement',     type: 'SUP' },
  { app: 'High-Voltage Direct Current (HVDC) Converter Station',proj: 'HVDC Terminus Station – Eastern Node',  type: 'SUP' },
  { app: 'Municipal Solid Waste Transfer Station',              proj: 'County Solid Waste Hub Facility',        type: 'CUP' },
  { app: 'Hydrogen Electrolysis Production Facility',           proj: 'Green Hydrogen Hub Phase I',             type: 'SUP' },
]

const STATUSES = ['Approved', 'Pending', 'Denied', 'Expired', 'Under Review']

const APPROVED_VOTES = [
  '5-0 Approved',
  '4-1 Approved',
  '3-2 Approved',
  '4-0 Approved (1 abstention)',
  '3-1-1 Approved',
]
const DENIED_VOTES  = ['2-3 Denied', '1-4 Denied', '0-5 Denied']
const PENDING_VOTES = ['N/A – Pending Hearing', 'Tabled – pending Environmental Impact Statement', 'Continued to next meeting']

const NOTES = [
  'Subject to noise impact study submitted within 90 days of approval.',
  'Requires archaeological survey prior to any ground disturbance; one historic site adjacent to parcel.',
  'Conditioned on FAA obstruction lighting compliance and aviation obstruction notice filing.',
  'Stormwater Pollution Prevention Plan (SWPPP) and erosion control plan required before grading permit issuance.',
  'Visual impact assessment and decommissioning bond of $1.8 M required before construction.',
  'Setback variance granted; 500 ft residential buffer maintained per zoning ordinance.',
  'NEPA categorical exclusion filed; full EIS determined not required.',
  'Environmental Impact Statement under state SEPA review; public comment period closed.',
  'Public hearing held; two adjacent property owner appeals pending before Board of Adjustments.',
  'Air quality permit from state EPA required before construction commences.',
  'Easement negotiations with 6 landowners ongoing; right-of-way acquisition 70% complete.',
  'Interconnection agreement with regional ISO/RTO pending final execution.',
  'Traffic impact study complete; road use agreement and bonding signed with county engineer.',
  'Reclamation and closure bond of $2.4 M posted with county treasurer.',
  'Wetlands delineation completed; Army Corps of Engineers Section 404 permit obtained.',
  'Fire protection plan approved by county fire marshal; annual vegetation management required.',
  'Cultural resource survey complete; no significant findings. Tribal consultation closed.',
  'Conditioned on wildlife corridor mitigation per state Fish & Wildlife recommendation.',
  'Applicant required to post $500 K performance bond prior to site preparation.',
  'Floodplain development permit obtained from county floodplain administrator.',
]

// ── Deterministic hash ───────────────────────────────────────────────────────
function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pick(arr, n) { return arr[Math.abs(n) % arr.length] }

function isoDate(dateObj) {
  return dateObj.toISOString().slice(0, 10)
}

// ── Source URL generator ─────────────────────────────────────────────────────
function sourceUrl(county, stateAbbr, id) {
  const slug  = county.toLowerCase().replace(/\s+/g, '')
  const state = stateAbbr.toLowerCase()
  const patterns = [
    `https://www.${slug}county.${state}.gov/planning/permits/detail?id=${id}`,
    `https://planning.${slug}co.us/applications/view/${id}`,
    `https://aca.${slug}${state}.gov/permits/public/${id}`,
    `https://permits.${slug}county.org/public/record/${id}`,
  ]
  return pick(patterns, hash(id))
}

// ── Main generator ───────────────────────────────────────────────────────────
const CUTOFF = new Date('2021-04-07')   // five years before today (2026-04-07)
const TODAY  = new Date('2026-04-07')
const MS_RANGE = TODAY.getTime() - CUTOFF.getTime()

/**
 * Generate deterministic mock SUP/CUP infrastructure permit records
 * for the given county.  `center` is [lat, lon] from the county GeoJSON centroid.
 */
export function generatePermits(county, stateAbbr, center) {
  const base  = hash(`${county}||${stateAbbr}`)
  const count = 10 + (base % 9)   // 10 – 18 records per county

  return Array.from({ length: count }, (_, i) => {
    const s1 = hash(`${base}:${i}`)
    const s2 = hash(`${s1}:b`)
    const s3 = hash(`${s2}:c`)

    // Application date: random point within last 5 years
    const msOff     = s1 % MS_RANGE
    const appDateObj = new Date(CUTOFF.getTime() + msOff)
    const appDate    = isoDate(appDateObj)

    const project = pick(PROJECTS, s2)
    const status  = pick(STATUSES, s3)

    // Expiration date: 2–5 years after application, only if approved/expired
    let expirationDate = null
    if (status === 'Approved' || status === 'Expired') {
      const yrs = 2 + (s3 % 4)
      const exp = new Date(appDateObj)
      exp.setFullYear(exp.getFullYear() + yrs)
      expirationDate = isoDate(exp)
    }

    // Voting record consistent with status
    let votingRecord
    if (status === 'Pending' || status === 'Under Review') {
      votingRecord = pick(PENDING_VOTES, s1)
    } else if (status === 'Denied') {
      votingRecord = pick(DENIED_VOTES, s2)
    } else {
      votingRecord = pick(APPROVED_VOTES, s1)
    }

    // Unique permit ID
    const id = `${stateAbbr}-${project.type}-${appDate.slice(0, 4)}-${String(s1 % 10000).padStart(4, '0')}`

    // Coordinates spread ±0.25° around county centroid
    const lat = center ? center[0] + ((s1 % 500) - 250) / 1000 : null
    const lon = center ? center[1] + ((s2 % 500) - 250) / 1000 : null

    return {
      id,
      appTitle:       project.app,
      projectTitle:   project.proj,
      permitType:     project.type,        // 'SUP' | 'CUP'
      status,
      appDate,
      expirationDate,
      votingRecord,
      notes:          pick(NOTES, hash(`${s3}:n`)),
      lat,
      lon,
      county,
      stateAbbr,
      source: {
        label: `${county} County Planning Dept. – Record ${id}`,
        url:   sourceUrl(county, stateAbbr, id),
      },
    }
  })
}

// ── Static data source metadata ──────────────────────────────────────────────
export const DATA_SOURCES = [
  {
    name: 'County Planning & Zoning Department',
    type: 'SUP / CUP applications, voting records, conditions of approval',
    notes: 'Primary source. Accessed via county open-data portals (Socrata, ArcGIS REST) or manual search pages where machine-readable data is unavailable.',
    url: null,
  },
  {
    name: 'State Environmental Quality Review (SEQR / SEPA)',
    type: 'Environmental impact assessments, EIS documents',
    notes: 'State-level environmental review filings associated with qualifying infrastructure permits.',
    url: null,
  },
  {
    name: 'U.S. Federal Energy Regulatory Commission (FERC) – eLibrary',
    type: 'Federal energy infrastructure permits (interstate pipelines, electric transmission)',
    notes: 'Applicable for projects requiring federal authorization under the Natural Gas Act or Federal Power Act.',
    url: 'https://www.ferc.gov/industries-data/elibrary',
  },
  {
    name: 'Bureau of Land Management (BLM) – ePlanning',
    type: 'Right-of-way grants and special use authorizations on federal land',
    notes: 'Relevant for projects crossing or situated on BLM-administered public lands.',
    url: 'https://eplanning.blm.gov',
  },
  {
    name: 'U.S. Army Corps of Engineers – Regulatory (ORM2)',
    type: 'Section 404 / 401 Clean Water Act permits',
    notes: 'Required for projects with wetland or navigable waterway impacts.',
    url: 'https://permits.ops.usace.army.mil',
  },
  {
    name: 'U.S. Census Bureau TIGER/Line – County Boundaries',
    type: 'County boundary GeoJSON polygons (mapping only)',
    notes: 'Geographic boundary data used to render and scope the terrain map.',
    url: 'https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html',
  },
  {
    name: 'Google Maps Terrain Tiles',
    type: 'Hillshade terrain base layer',
    notes: 'Elevation and terrain relief rendering for the interactive map.',
    url: 'https://maps.google.com',
  },
]
