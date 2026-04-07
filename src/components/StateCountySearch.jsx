import { useState, useEffect, useMemo, useRef } from 'react'
import './StateCountySearch.css'

const US_STATES = [
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

export { US_STATES }

export default function StateCountySearch({
  countyData,
  selectedStateFips,
  selectedCountyName,
  onStateChange,
  onCountySelect,
}) {
  const [countyQuery, setCountyQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)

  const selectedState = US_STATES.find(s => s.fips === selectedStateFips) || null

  // When external selection changes (map click), sync the input
  useEffect(() => {
    setCountyQuery(selectedCountyName || '')
  }, [selectedCountyName])

  // Clear county input when state changes
  useEffect(() => {
    setCountyQuery('')
    setShowDropdown(false)
  }, [selectedStateFips])

  const countyList = useMemo(() => {
    if (!countyData || !selectedStateFips) return []
    return countyData.features
      .filter(f => f.properties.STATE === selectedStateFips)
      .map(f => f.properties.NAME)
      .sort()
  }, [countyData, selectedStateFips])

  const filteredCounties = useMemo(() => {
    const q = countyQuery.toLowerCase().trim()
    if (!q) return countyList
    return countyList.filter(c => c.toLowerCase().includes(q))
  }, [countyList, countyQuery])

  const handleStateChange = (fips) => {
    onStateChange(fips || null)
  }

  const handleCountySelect = (countyName) => {
    setCountyQuery(countyName)
    setShowDropdown(false)
    onCountySelect({
      name: countyName,
      stateFips: selectedStateFips,
      stateAbbr: selectedState?.abbr || '',
    })
  }

  return (
    <div className="scs-wrapper">
      {/* Step 1 — State */}
      <div className="scs-step">
        <label className="scs-label">State</label>
        <select
          className="scs-select"
          value={selectedStateFips || ''}
          onChange={e => handleStateChange(e.target.value)}
        >
          <option value="">Select state…</option>
          {US_STATES.map(s => (
            <option key={s.fips} value={s.fips}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStateFips && (
        <>
          <span className="scs-arrow">›</span>

          {/* Step 2 — County */}
          <div className="scs-step scs-step--county">
            <label className="scs-label">County</label>
            <div className="scs-county-wrap">
              <input
                ref={inputRef}
                type="text"
                className="scs-input"
                placeholder={`Search in ${selectedState?.name}…`}
                value={countyQuery}
                onChange={e => { setCountyQuery(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                autoComplete="off"
                spellCheck={false}
              />
              {showDropdown && filteredCounties.length > 0 && (
                <ul className="scs-dropdown">
                  {filteredCounties.slice(0, 14).map(county => (
                    <li
                      key={county}
                      className={`scs-dropdown-item ${county === selectedCountyName ? 'scs-dropdown-item--active' : ''}`}
                      onMouseDown={() => handleCountySelect(county)}
                    >
                      {county} County,&nbsp;<span className="scs-state-abbr">{selectedState?.abbr}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
