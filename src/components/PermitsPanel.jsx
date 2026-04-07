import { useMemo } from 'react'
import './PermitsPanel.css'

// ── Deterministic mock-data generator ───────────────────────────────────────
// Replace the body of this function with a real API call when data is available.

const TYPES  = ['Building','Electrical','Plumbing','Mechanical','Grading','Demolition','Roofing','HVAC','Fire Suppression','Zoning']
const STATUS = ['Issued','Pending','Approved','Under Review','Expired','Finaled','Denied']
const DESCS  = [
  'New Single Family Residence',
  'Commercial Tenant Improvement',
  'Residential Addition / Remodel',
  'HVAC System Replacement',
  'Roof Replacement',
  'Electrical Panel Upgrade',
  'Plumbing Remodel – Kitchen & Bath',
  'Accessory Dwelling Unit (ADU)',
  'Deck / Patio Construction',
  'Commercial New Construction',
  'In-Ground Swimming Pool',
  'Solar Panel Installation',
  'Retaining Wall',
  'Interior Renovation',
]
const STREETS = ['Main St','Oak Ave','Elm Dr','Pine Rd','Maple Ln','Cedar Blvd','Park Way','Lake Dr','Ridge Ct','Valley Rd']

function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pick(arr, seed) { return arr[seed % arr.length] }

function generatePermits(countyName, stateAbbr) {
  const base = hash(`${countyName}${stateAbbr}`)
  const count = 8 + (base % 8)
  return Array.from({ length: count }, (_, i) => {
    const s  = hash(`${base}${i}`)
    const s2 = hash(`${s}x`)
    const year  = 2022 + (s % 3)
    const month = 1  + (s2 % 12)
    const day   = 1  + ((s >> 4) % 28)
    return {
      id:      `${stateAbbr}-${year}-${String(s % 100000).padStart(5, '0')}`,
      type:    pick(TYPES,  s),
      status:  pick(STATUS, s2),
      desc:    pick(DESCS,  hash(`${s}d`)),
      date:    `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
      address: `${100 + (s % 1900)} ${pick(STREETS, s2)}, ${countyName}, ${stateAbbr}`,
      docs:    1 + (s % 4),
    }
  })
}

const STATUS_CLASS = {
  'Issued':       'status--issued',
  'Approved':     'status--issued',
  'Finaled':      'status--issued',
  'Pending':      'status--pending',
  'Under Review': 'status--pending',
  'Expired':      'status--expired',
  'Denied':       'status--expired',
}

function DocIcon() {
  return (
    <svg viewBox="0 0 16 20" fill="none" width="14" height="14">
      <rect x="1" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4 6h6M4 9h6M4 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M11 1v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}

export default function PermitsPanel({ county }) {
  const permits = useMemo(
    () => generatePermits(county.name, county.stateAbbr),
    [county.name, county.stateAbbr],
  )

  return (
    <section className="permits-panel">
      <div className="permits-header">
        <div>
          <h2 className="permits-title">
            {county.name} County,&nbsp;
            <span className="permits-state">{county.stateAbbr}</span>
          </h2>
          <p className="permits-subtitle">Permit Documents &mdash; {permits.length} records&nbsp;
            <span className="permits-mock-note">(sample data)</span>
          </p>
        </div>
      </div>

      <div className="permits-table-wrap">
        <table className="permits-table">
          <thead>
            <tr>
              <th>Permit #</th>
              <th>Type</th>
              <th>Description</th>
              <th>Status</th>
              <th>Date Filed</th>
              <th>Address</th>
              <th>Documents</th>
            </tr>
          </thead>
          <tbody>
            {permits.map(p => (
              <tr key={p.id}>
                <td className="permit-id">{p.id}</td>
                <td>{p.type}</td>
                <td className="permit-desc">{p.desc}</td>
                <td>
                  <span className={`permit-status ${STATUS_CLASS[p.status] || ''}`}>
                    {p.status}
                  </span>
                </td>
                <td className="permit-date">{p.date}</td>
                <td className="permit-address">{p.address}</td>
                <td>
                  <div className="permit-docs">
                    {Array.from({ length: p.docs }, (_, di) => (
                      <button
                        key={di}
                        className="doc-btn"
                        title={`Document ${di + 1}`}
                        onClick={() => {}}
                      >
                        <DocIcon />
                        <span>Doc {di + 1}</span>
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
