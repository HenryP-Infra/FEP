import streamlit as st
import folium
from streamlit_folium import st_folium
import requests

st.set_page_config(
    page_title="US County Map",
    page_icon="🗺️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Constants ────────────────────────────────────────────────────────────────

COUNTY_GEOJSON_URL = (
    "https://raw.githubusercontent.com/plotly/datasets/master/"
    "geojson-counties-fips.json"
)

TILE_LAYERS = {
    "Satellite": {
        "tiles": "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        "attr": "© Google Maps",
    },
    "Terrain": {
        "tiles": "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
        "attr": "© Google Maps",
    },
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# ── Cached data loaders ──────────────────────────────────────────────────────

@st.cache_data(show_spinner="Loading county boundaries…")
def load_county_data():
    resp = requests.get(COUNTY_GEOJSON_URL, timeout=30)
    resp.raise_for_status()
    return resp.json()


@st.cache_data(show_spinner=False)
def geocode(query: str):
    params = {
        "q": query,
        "format": "json",
        "addressdetails": "1",
        "limit": "6",
        "countrycodes": "us",
    }
    headers = {"User-Agent": "USCountyMapStreamlit/1.0"}
    resp = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


# ── Session state defaults ───────────────────────────────────────────────────

def _init_state():
    defaults = {
        "center": [39.5, -98.35],
        "zoom": 4,
        "marker": None,
        "search_results": [],
        "search_query": "",
        "selected_result": None,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val

_init_state()

# ── Sidebar ──────────────────────────────────────────────────────────────────

with st.sidebar:
    st.title("🗺️ US County Map")
    st.markdown("---")

    # Layer selector
    st.subheader("Map Layer")
    active_layer = st.radio(
        "Select a base layer",
        list(TILE_LAYERS.keys()),
        label_visibility="collapsed",
        horizontal=True,
    )

    st.markdown("---")

    # Address search
    st.subheader("Search Address")
    search_query = st.text_input(
        "Address or place name",
        placeholder="e.g. 1600 Pennsylvania Ave, Washington DC",
        label_visibility="collapsed",
    )

    search_clicked = st.button("🔍 Search", use_container_width=True)

    if search_clicked and search_query.strip():
        with st.spinner("Searching…"):
            try:
                results = geocode(search_query.strip())
                st.session_state.search_results = results
                st.session_state.search_query = search_query.strip()
                st.session_state.selected_result = None
            except Exception as e:
                st.error(f"Search failed: {e}")
                st.session_state.search_results = []

    # Show result picker if we have results
    if st.session_state.search_results:
        result_labels = [r["display_name"] for r in st.session_state.search_results]
        chosen_label = st.selectbox(
            "Select a result",
            result_labels,
            key="result_picker",
        )
        chosen = next(
            r for r in st.session_state.search_results
            if r["display_name"] == chosen_label
        )

        if st.button("📍 Go to location", use_container_width=True):
            lat = float(chosen["lat"])
            lon = float(chosen["lon"])
            st.session_state.center = [lat, lon]
            st.session_state.zoom = 11
            st.session_state.marker = {
                "latlng": [lat, lon],
                "label": chosen["display_name"],
            }
            st.session_state.search_results = []

    st.markdown("---")
    st.caption(
        "County boundaries: [Plotly Datasets](https://github.com/plotly/datasets)  \n"
        "Geocoding: [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org)  \n"
        "Tiles: Google Maps"
    )

# ── Map ──────────────────────────────────────────────────────────────────────

try:
    county_data = load_county_data()
    county_load_ok = True
except Exception as e:
    st.error(f"Could not load county boundaries: {e}")
    county_data = None
    county_load_ok = False

layer_cfg = TILE_LAYERS[active_layer]

m = folium.Map(
    location=st.session_state.center,
    zoom_start=st.session_state.zoom,
    tiles=layer_cfg["tiles"],
    attr=layer_cfg["attr"],
    max_zoom=20,
)

if county_data:
    folium.GeoJson(
        county_data,
        name="US Counties",
        style_function=lambda _: {
            "fillColor": "#4a90e2",
            "fillOpacity": 0.08,
            "color": "#2563eb",
            "weight": 0.5,
            "opacity": 0.6,
        },
        highlight_function=lambda _: {
            "fillColor": "#2563eb",
            "fillOpacity": 0.3,
            "color": "#1d4ed8",
            "weight": 2,
            "opacity": 1.0,
        },
        tooltip=folium.GeoJsonTooltip(
            fields=["NAME"],
            aliases=["County:"],
            localize=True,
            sticky=True,
            style=(
                "background-color: rgba(0,0,0,0.8);"
                "color: white;"
                "font-size: 13px;"
                "border-radius: 4px;"
                "padding: 4px 8px;"
                "border: none;"
            ),
        ),
    ).add_to(m)

if st.session_state.marker:
    mk = st.session_state.marker
    folium.Marker(
        location=mk["latlng"],
        popup=folium.Popup(mk["label"], max_width=300),
        tooltip="📍 Search result",
        icon=folium.Icon(color="blue", icon="map-marker", prefix="fa"),
    ).add_to(m)

st_folium(m, use_container_width=True, height=750, returned_objects=[])
