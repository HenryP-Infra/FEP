import './LayerControl.css'

export default function LayerControl({ layers, activeLayer, onLayerChange }) {
  return (
    <div className="layer-control" role="group" aria-label="Map layer selection">
      {Object.entries(layers).map(([key, layer]) => (
        <button
          key={key}
          className={`layer-btn ${activeLayer === key ? 'layer-btn--active' : ''}`}
          onClick={() => onLayerChange(key)}
          aria-pressed={activeLayer === key}
          title={`Switch to ${layer.label} view`}
        >
          <LayerIcon type={key} />
          <span>{layer.label}</span>
        </button>
      ))}
    </div>
  )
}

function LayerIcon({ type }) {
  if (type === 'satellite') {
    return (
      <svg className="layer-icon" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="16" height="16" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.6" />
        <path d="M10 4v2M10 14v2M4 10h2M14 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg className="layer-icon" viewBox="0 0 20 20" fill="none">
      <path
        d="M2 14 L6 8 L10 11 L14 5 L18 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 17h16" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
    </svg>
  )
}
