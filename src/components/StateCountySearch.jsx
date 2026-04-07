import { useState, useMemo, useRef, useEffect } from 'react'
import './StateCountySearch.css'

export const US_STATES = [
  { fips: '01', name: 'Alabama',        abbr: 'AL' },
  { fips: '02', name: 'Alaska',         abbr: 'AK' },
  { fips: '04', name: 'Arizona',        abbr: 'AZ' },
  { fips: '05', name: 'Arkansas',       abbr: 'AR' },
  { fips: '06', name: 'California',     abbr: 'CA' },
  { fips: '08', name: 'Colorado',       abbr: 'CO' },
  { fips: '09', name: 'Connecticut',    abbr: 'CT' },
  { fips: '10', name: 'Delaware',       abbr: 'DE' },
  { fips: '11', name: 'DC',             abbr: 'DC' },
  { fips: '12', name: 'Florida',        abbr: 'FL' },
  { fips: '13', name: 'Georgia',        abbr: 'GA' },
  { fips: '15', name: 'Hawaii',         abbr: 'HI' },
  { fips: '16', name: 'Idaho',          abbr: 'ID' },
  { fips: '17', name: 'Illinois',       abbr: 'IL' },
  { fips: '18', name: 'Indiana',        abbr: 'IN' },
  { fips: '19', name: 'Iowa',           abbr: 'IA' },
  { fips: '20', name: 'Kansas',         abbr: 'KS' },
  { fips: '21', name: 'Kentucky',       abbr: 'KY' },
  { fips: '22', name: 'Louisiana',      abbr: 'LA' },
  { fips: '23', name: 'Maine',          abbr: 'ME' },
  { fips: '24', name: 'Maryland',       abbr: 'MD' },
  { fips: '25', name: 'Massachusetts',  abbr: 'MA' },
  { fips: '26', name: 'Michigan',       abbr: 'MI' },
  { fips: '27', name: 'Minnesota',      abbr: 'MN' },
  { fips: '28', name: 'Mississippi',    abbr: 'MS' },
  { fips: '29', name: 'Missouri',       abbr: 'MO' },
  { fips: '30', name: 'Montana',        abbr: 'MT' },
  { fips: '31', name: 'Nebraska',       abbr: 'NE' },
  { fips: '32', name: 'Nevada',         abbr: 'NV' },
  { fips: '33', name: 'New Hampshire',  abbr: 'NH' },
  { fips: '34', name: 'New Jersey',     abbr: 'NJ' },
  { fips: '35', name: 'New Mexico',     abbr: 'NM' },
  { fips: '36', name: 'New York',       abbr: 'NY' },
  { fips: '37', name: 'North Carolina', abbr: 'NC' },
  { fips: '38', name: 'North Dakota',   abbr: 'ND' },
  { fips: '39', name: 'Ohio',           abbr: 'OH' },
  { fips: '40', name: 'Oklahoma',       abbr: 'OK' },
  { fips: '41', name: 'Oregon',         abbr: 'OR' },
  { fips: '42', name: 'Pennsylvania',   abbr: 'PA' },
  { fips: '44', name: 'Rhode Island',   abbr: 'RI' },
  { fips: '45', name: 'South Carolina', abbr: 'SC' },
  { fips: '46', name: 'South Dakota',   abbr: 'SD' },
  { fips: '47', name: 'Tennessee',      abbr: 'TN' },
  { fips: '48', name: 'Texas',          abbr: 'TX' },
  { fips: '49', name: 'Utah',           abbr: 'UT' },
  { fips: '50', name: 'Vermont',        abbr: 'VT' },
  { fips: '51', name: 'Virginia',       abbr: 'VA' },
  { fips: '53', name: 'Washington',     abbr: 'WA' },
  { fips: '54', name: 'West Virginia',  abbr: 'WV' },
  { fips: '55', name: 'Wisconsin',      abbr: 'WI' },
  { fips: '56', name: 'Wyoming',        abbr: 'WY' },
  { fips: '72', name: 'Puerto Rico',    abbr: 'PR' },
]

/**
 * Two-step search: (1) state dropdown, (2) multi-county checkbox list.
 * Shows selected counties as removable pills and a Run button.
 *
 * Props:
 *   countyData          – raw GeoJSON object (may be null while loading)
 *   selectedStateFips   – controlled state FIPS string | null
 *   selectedCounties    – array of { name, stateFips, stateAbbr }
 *   onStateChange(fips) – called when state changes (fips may be null)
 *   onCountiesChange(arr) – called with updated county array
 *   onRun()             – called when Run button clicked
 */
export default function StateCountySearch({
  countyData,
  selectedStateFips,
  selectedCounties,
  onStateChange,
  onCountiesChange,
  onRun,
}) {
  const [query, setQuery]               = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef(null)
  const wrapRef  = useRef(null)

  const selectedState = US_STATES.find(s => s.fips === selectedStateFips) ?? null

  // Reset county input when state changes
  useEffect(() => {
    setQuery('')
    setDropdownOpen(false)
  }, [selectedStateFips])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // All counties for the selected state, sorted
  const countyList = useMemo(() => {
    if (!countyData || !selectedStateFips) return []
    return countyData.features
      .filter(f => f.properties.STATE === selectedStateFips)
      .map(f => f.properties.NAME)
      .sort()
  }, [countyData, selectedStateFips])

  // Counties filtered by query
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return q ? countyList.filter(c => c.toLowerCase().includes(q)) : countyList
  }, [countyList, query])

  const selectedNames = useMemo(
    () => new Set(selectedCounties.map(c => c.name)),
    [selectedCounties],
  )

  function toggleCounty(name) {
    if (selectedNames.has(name)) {
      onCountiesChange(selectedCounties.filter(c => c.name !== name))
    } else {
      onCountiesChange([
        ...selectedCounties,
        { name, stateFips: selectedStateFips, stateAbbr: selectedState?.abbr ?? '' },
      ])
    }
  }

  function removeCounty(name) {
    onCountiesChange(selectedCounties.filter(c => c.name !== name))
  }

  function clearAll() {
    onCountiesChange([])
    setQuery('')
  }

  const canRun = selectedCounties.length > 0

  return (
    <div className="scs-wrapper">
      {/* ── Step 1: State ── */}
      <div className="scs-group">
        <label className="scs-label">State</label>
        <select
          className="scs-select"
          value={selectedStateFips ?? ''}
          onChange={e => onStateChange(e.target.value || null)}
        >
          <option value="">Select state…</option>
          {US_STATES.map(s => (
            <option key={s.fips} value={s.fips}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStateFips && (
        <>
          <span className="scs-divider">›</span>

          {/* ── Step 2: County multi-select ── */}
          <div className="scs-group scs-group--county" ref={wrapRef}>
            <label className="scs-label">
              Counties
              {selectedCounties.length > 0 && (
                <span className="scs-count">&nbsp;{selectedCounties.length} selected</span>
              )}
            </label>

            {/* Search input */}
            <div className="scs-input-wrap">
              <input
                ref={inputRef}
                type="text"
                className="scs-input"
                placeholder={
                  countyList.length === 0
                    ? 'Loading counties…'
                    : `Search ${selectedState?.name} counties…`
                }
                value={query}
                disabled={countyList.length === 0}
                onChange={e => { setQuery(e.target.value); setDropdownOpen(true) }}
                onFocus={() => setDropdownOpen(true)}
                autoComplete="off"
                spellCheck={false}
              />
              {selectedCounties.length > 0 && (
                <button
                  className="scs-clear-btn"
                  onClick={clearAll}
                  title="Clear all counties"
                  type="button"
                >
                  ×
                </button>
              )}

              {/* Dropdown */}
              {dropdownOpen && filtered.length > 0 && (
                <ul className="scs-dropdown">
                  {filtered.slice(0, 18).map(name => {
                    const checked = selectedNames.has(name)
                    return (
                      <li
                        key={name}
                        className={`scs-item ${checked ? 'scs-item--checked' : ''}`}
                        onMouseDown={e => { e.preventDefault(); toggleCounty(name) }}
                      >
                        <span className="scs-checkbox" aria-hidden="true">
                          {checked ? '✓' : ''}
                        </span>
                        <span className="scs-item-name">{name}</span>
                        <span className="scs-item-abbr">{selectedState?.abbr}</span>
                      </li>
                    )
                  })}
                  {filtered.length > 18 && (
                    <li className="scs-more">
                      +{filtered.length - 18} more — type to narrow
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Selected county pills */}
            {selectedCounties.length > 0 && (
              <div className="scs-pills">
                {selectedCounties.map(c => (
                  <span key={c.name} className="scs-pill">
                    {c.name}
                    <button
                      className="scs-pill-x"
                      onClick={() => removeCounty(c.name)}
                      type="button"
                      aria-label={`Remove ${c.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Run button ── */}
      {selectedStateFips && (
        <button
          className={`scs-run ${canRun ? 'scs-run--active' : ''}`}
          onClick={canRun ? onRun : undefined}
          disabled={!canRun}
          type="button"
          title={canRun ? 'Load map and permits' : 'Select at least one county'}
        >
          Run
        </button>
      )}
    </div>
  )
}
