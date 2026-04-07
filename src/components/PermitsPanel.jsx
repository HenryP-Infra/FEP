import { useState, useMemo, useCallback } from 'react'
import { DATA_SOURCES } from '../utils/permitData'
import './PermitsPanel.css'

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_META = {
  Approved:       { cls: 'status--approved',  label: 'Approved'      },
  Expired:        { cls: 'status--expired',   label: 'Expired'       },
  Denied:         { cls: 'status--denied',    label: 'Denied'        },
  Pending:        { cls: 'status--pending',   label: 'Pending'       },
  'Under Review': { cls: 'status--pending',   label: 'Under Review'  },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { cls: '', label: status }
  return <span className={`permit-status ${meta.cls}`}>{meta.label}</span>
}

function TypeBadge({ type }) {
  return (
    <span className={`permit-type ${type === 'SUP' ? 'type--sup' : 'type--cup'}`}>
      {type}
    </span>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────
function escapeCsv(val) {
  if (val == null) return ''
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function exportCsv(permits) {
  const headers = [
    'Application Title', 'Project Title', 'Permit Type', 'Status',
    'Application Date', 'Expiration Date', 'Voting Record', 'County',
    'State', 'Notes', 'Source URL',
  ]
  const rows = permits.map(p => [
    p.appTitle, p.projectTitle, p.permitType, p.status,
    p.appDate, p.expirationDate ?? '', p.votingRecord,
    p.county, p.stateAbbr, p.notes, p.source.url,
  ].map(escapeCsv).join(','))

  const csv  = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `infrastructure-permits-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="sort-icon sort-icon--none">⇅</span>
  return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PermitsPanel({ counties, permits }) {
  // Filter state
  const [keyword,    setKeyword]    = useState('')
  const [typeFilter, setTypeFilter] = useState('all')    // 'all' | 'SUP' | 'CUP'
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  // Sort state
  const [sortCol, setSortCol] = useState('appDate')
  const [sortDir, setSortDir] = useState('desc')

  // Sources panel
  const [sourcesOpen, setSourcesOpen] = useState(false)

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return permits.filter(p => {
      if (typeFilter !== 'all' && p.permitType !== typeFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (dateFrom && p.appDate < dateFrom) return false
      if (dateTo   && p.appDate > dateTo)   return false
      if (kw) {
        const haystack = [p.appTitle, p.projectTitle, p.county, p.notes, p.votingRecord]
          .join(' ').toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })
  }, [permits, keyword, typeFilter, statusFilter, dateFrom, dateTo])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortCol] ?? ''
      let bv = b[sortCol] ?? ''
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1  : -1
      return 0
    })
  }, [filtered, sortCol, sortDir])

  const handleSort = useCallback((col) => {
    setSortCol(prev => {
      if (prev === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return col }
      setSortDir('asc')
      return col
    })
  }, [])

  // ── Title line ─────────────────────────────────────────────────────────────
  const countyLabel = counties.length === 1
    ? `${counties[0].name} County, ${counties[0].stateAbbr}`
    : `${counties.length} Counties – ${counties.map(c => c.stateAbbr).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}`

  const uniqueStatuses = [...new Set(permits.map(p => p.status))].sort()

  return (
    <section className="pp-panel">
      {/* ── Panel header ── */}
      <div className="pp-header">
        <div>
          <h2 className="pp-title">{countyLabel}</h2>
          <p className="pp-subtitle">
            Infrastructure Special Use &amp; Conditional Use Permits &mdash; last 5 years
            &nbsp;&middot;&nbsp;
            <span className="pp-count">{filtered.length}</span> of {permits.length} records
            &nbsp;
            <span className="pp-demo-note">(illustrative data)</span>
          </p>
        </div>
        <button
          className="pp-export-btn"
          onClick={() => exportCsv(sorted)}
          title="Export visible records to CSV"
          type="button"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="pp-filters">
        <input
          type="text"
          className="pp-filter-input pp-filter-input--wide"
          placeholder="Search permits…"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          aria-label="Search permits"
        />

        <select
          className="pp-filter-select"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          aria-label="Filter by permit type"
        >
          <option value="all">All Types</option>
          <option value="SUP">SUP only</option>
          <option value="CUP">CUP only</option>
        </select>

        <select
          className="pp-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {uniqueStatuses.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="pp-date-range">
          <input
            type="date"
            className="pp-filter-input"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="Application date from"
            aria-label="Date from"
          />
          <span className="pp-date-sep">–</span>
          <input
            type="date"
            className="pp-filter-input"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="Application date to"
            aria-label="Date to"
          />
        </div>

        {(keyword || typeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
          <button
            className="pp-clear-btn"
            type="button"
            onClick={() => {
              setKeyword('')
              setTypeFilter('all')
              setStatusFilter('all')
              setDateFrom('')
              setDateTo('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Permit table ── */}
      <div className="pp-table-wrap">
        {sorted.length === 0 ? (
          <div className="pp-empty">
            No permits match the current filters.
            {!permits.length && (
              <span> This county may not publish machine-readable permit data.
                {counties[0] && (
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(counties[0].name + ' County ' + counties[0].stateAbbr + ' planning department permits')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pp-link"
                  >
                    &nbsp;Search county planning department ↗
                  </a>
                )}
              </span>
            )}
          </div>
        ) : (
          <table className="pp-table">
            <thead>
              <tr>
                {[
                  { col: 'appTitle',       label: 'Application Title'  },
                  { col: 'projectTitle',   label: 'Project Title'      },
                  { col: 'permitType',     label: 'Type'               },
                  { col: 'status',         label: 'Status'             },
                  { col: 'appDate',        label: 'App. Date'          },
                  { col: 'expirationDate', label: 'Expiration Date'    },
                  { col: 'votingRecord',   label: 'Voting Record'      },
                  { col: 'notes',          label: 'Notes'              },
                  { col: null,             label: 'Source'             },
                ].map(({ col, label }) => (
                  <th
                    key={label}
                    className={col ? 'pp-th--sortable' : ''}
                    onClick={col ? () => handleSort(col) : undefined}
                  >
                    {label}
                    {col && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id}>
                  <td className="pp-td--title">{p.appTitle}</td>
                  <td className="pp-td--proj">{p.projectTitle}</td>
                  <td><TypeBadge type={p.permitType} /></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="pp-td--date">{p.appDate}</td>
                  <td className="pp-td--date">{p.expirationDate ?? '—'}</td>
                  <td className="pp-td--vote">{p.votingRecord}</td>
                  <td className="pp-td--notes">{p.notes}</td>
                  <td className="pp-td--source">
                    <a
                      href={p.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pp-source-link"
                      title={p.source.label}
                    >
                      View ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Data Sources panel ── */}
      <div className="pp-sources">
        <button
          className="pp-sources-toggle"
          type="button"
          onClick={() => setSourcesOpen(o => !o)}
          aria-expanded={sourcesOpen}
        >
          <span className="pp-sources-caret">{sourcesOpen ? '▾' : '▸'}</span>
          Data Sources &amp; Methodology
        </button>

        {sourcesOpen && (
          <div className="pp-sources-body">
            <p className="pp-sources-intro">
              Records are sourced from the following agencies and databases, in priority order.
              Where machine-readable data is unavailable, direct links to manual search pages are
              provided. All source URLs in the table link to the originating record.
            </p>
            <table className="pp-sources-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Data Provided</th>
                  <th>Notes / Limitations</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SOURCES.map(src => (
                  <tr key={src.name}>
                    <td>
                      {src.url ? (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pp-link"
                        >
                          {src.name} ↗
                        </a>
                      ) : (
                        <strong>{src.name}</strong>
                      )}
                    </td>
                    <td>{src.type}</td>
                    <td className="pp-sources-notes">{src.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pp-sources-disclaimer">
              <strong>Demo note:</strong> Permit records shown are deterministically generated
              illustrative data. In production, replace <code>generatePermits()</code> in{' '}
              <code>src/utils/permitData.js</code> with live API calls to county, state, and
              federal data sources listed above.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
