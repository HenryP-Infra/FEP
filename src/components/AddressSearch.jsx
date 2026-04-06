import { useState, useRef, useCallback } from 'react'
import './AddressSearch.css'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export default function AddressSearch({ onAddressFound }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  const search = useCallback(async (value) => {
    if (!value.trim() || value.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: value,
        format: 'json',
        addressdetails: '1',
        limit: '6',
        countrycodes: 'us',
      })

      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { 'Accept-Language': 'en' },
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      setSuggestions(data)
      setOpen(data.length > 0)
    } catch (err) {
      setError('Search failed. Please try again.')
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)
    setError(null)

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(value)
    }, 400)
  }

  const handleSelect = (result) => {
    setQuery(result.display_name)
    setSuggestions([])
    setOpen(false)
    onAddressFound({
      latlng: [parseFloat(result.lat), parseFloat(result.lon)],
      label: result.display_name,
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelect(suggestions[0])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) search(query)
  }

  return (
    <div className="address-search">
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrap">
          <svg className="search-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search address or place..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <span className="search-spinner" aria-label="Searching" />}
          {query && !loading && (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                setQuery('')
                setSuggestions([])
                setOpen(false)
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </form>

      {error && <div className="search-error">{error}</div>}

      {open && suggestions.length > 0 && (
        <ul className="search-suggestions" role="listbox">
          {suggestions.map((result) => (
            <li
              key={result.place_id}
              role="option"
              className="suggestion-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(result)}
            >
              <svg className="suggestion-pin" viewBox="0 0 16 20" fill="none">
                <path
                  d="M8 0C4.686 0 2 2.686 2 6c0 4.5 6 14 6 14s6-9.5 6-14c0-3.314-2.686-6-6-6z"
                  fill="#4a90e2"
                />
                <circle cx="8" cy="6" r="2.5" fill="#fff" />
              </svg>
              <span className="suggestion-text">{result.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
