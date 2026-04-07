import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

// Color scheme
const COLOR = { SUP: '#3b82f6', CUP: '#f97316' }
const GRAY  = '#6b7280'

function buildIcon(permit) {
  const isDenied  = permit.status === 'Denied' || permit.status === 'Expired'
  const isPending = permit.status === 'Pending' || permit.status === 'Under Review'
  const ring = isDenied ? GRAY : (COLOR[permit.permitType] ?? COLOR.SUP)
  const fill = isPending ? 'rgba(15,15,30,0.85)' : ring
  const opacity = isDenied ? 0.55 : 1

  return L.divIcon({
    className: '',
    html: `<div style="
      width:13px;height:13px;border-radius:50%;
      background:${fill};
      border:2.5px solid ${ring};
      opacity:${opacity};
      box-shadow:0 1px 5px rgba(0,0,0,.55);
      cursor:pointer;
    "></div>`,
    iconSize:    [13, 13],
    iconAnchor:  [6.5, 6.5],
    popupAnchor: [0, -9],
  })
}

function buildPopup(p) {
  const typeColor = p.permitType === 'SUP' ? '#3b82f6' : '#f97316'
  const statusColors = {
    Approved:       { bg: 'rgba(34,197,94,.18)',  fg: '#4ade80' },
    Expired:        { bg: 'rgba(239,68,68,.15)',   fg: '#f87171' },
    Denied:         { bg: 'rgba(239,68,68,.15)',   fg: '#f87171' },
    Pending:        { bg: 'rgba(234,179,8,.15)',   fg: '#facc15' },
    'Under Review': { bg: 'rgba(234,179,8,.15)',   fg: '#facc15' },
  }
  const sc = statusColors[p.status] ?? { bg: 'rgba(255,255,255,.1)', fg: '#fff' }

  return `
    <div class="pm-popup">
      <div class="pm-popup-header">
        <span class="pm-type-badge" style="background:${typeColor}22;color:${typeColor};border:1px solid ${typeColor}44">${p.permitType}</span>
        <span class="pm-status-badge" style="background:${sc.bg};color:${sc.fg}">${p.status}</span>
      </div>
      <div class="pm-popup-title">${p.appTitle}</div>
      <div class="pm-popup-proj">${p.projectTitle}</div>
      <div class="pm-popup-rows">
        <div><span>Filed</span>${p.appDate}</div>
        ${p.expirationDate ? `<div><span>Expires</span>${p.expirationDate}</div>` : ''}
        ${p.votingRecord   ? `<div><span>Vote</span>${p.votingRecord}</div>`      : ''}
        <div><span>County</span>${p.county}, ${p.stateAbbr}</div>
      </div>
      <a class="pm-popup-link" href="${p.source.url}" target="_blank" rel="noopener noreferrer">
        View Source Record ↗
      </a>
    </div>`
}

export default function PermitMarkers({ permits }) {
  const map        = useMap()
  const markersRef = useRef([])

  useEffect(() => {
    // Clear previous markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (!permits?.length) return

    permits.forEach(p => {
      if (p.lat == null || p.lon == null) return
      const marker = L.marker([p.lat, p.lon], { icon: buildIcon(p) })
        .bindPopup(buildPopup(p), { maxWidth: 290, className: 'pm-leaflet-popup' })
        .addTo(map)
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
    }
  }, [map, permits])

  return null
}
