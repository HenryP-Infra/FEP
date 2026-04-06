import streamlit as st
import folium
from streamlit_folium import st_folium
import requests

st.set_page_config(
    page_title="US County Map",
    page_icon="🗺️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Remove Streamlit chrome padding so the map sits flush
st.markdown(
    """
    <style>
    #root > div:first-child { padding-top: 0; }
    .block-container { padding: 0 !important; max-width: 100% !important; }
    header[data-testid="stHeader"] { display: none; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Constants ─────────────────────────────────────────────────────────────────

COUNTY_GEOJSON_URL = (
    "https://raw.githubusercontent.com/plotly/datasets/master/"
    "geojson-counties-fips.json"
)

TILE_LAYERS = {
    "Google Maps": {
        "tiles": "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        "attr": "© Google Maps",
    },
    "Terrain": {
        "tiles": "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
        "attr": "© Google Maps",
    },
}

FIPS_TO_STATE = {
    "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
    "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
    "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
    "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
    "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
    "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
    "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
    "55":"WI","56":"WY","72":"PR","78":"VI",
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# ── Cached loaders ────────────────────────────────────────────────────────────

@st.cache_data(show_spinner="Loading county boundaries…")
def load_county_data():
    resp = requests.get(COUNTY_GEOJSON_URL, timeout=30)
    resp.raise_for_status()
    return resp.json()


@st.cache_data(show_spinner=False)
def geocode(query: str):
    params = {"q": query, "format": "json", "addressdetails": "1",
              "limit": "6", "countrycodes": "us"}
    headers = {"User-Agent": "USCountyMapStreamlit/1.0"}
    resp = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


# ── Session state ─────────────────────────────────────────────────────────────

def _init():
    defaults = {
        "center": [39.5, -98.35],
        "zoom": 4,
        "marker": None,
        "search_results": [],
        "selected_county": None,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

_init()

# ── Top control bar ───────────────────────────────────────────────────────────

st.markdown(
    "<div style='background:#0a0a18;padding:8px 14px;display:flex;"
    "align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.08);'>"
    "<span style='color:#fff;font-size:16px;font-weight:700;white-space:nowrap;'>"
    "🗺️ US County Map</span></div>",
    unsafe_allow_html=True,
)

col_search, col_btn, col_layer = st.columns([5, 1, 2])

with col_search:
    search_query = st.text_input(
        "search",
        placeholder="Search address or place…",
        label_visibility="collapsed",
    )

with col_btn:
    search_clicked = st.button("Search", use_container_width=True)

with col_layer:
    show_terrain = st.toggle("Terrain View", value=False)

active_layer = "Terrain" if show_terrain else "Google Maps"

# Handle search
if search_clicked and search_query.strip():
    with st.spinner("Searching…"):
        try:
            results = geocode(search_query.strip())
            st.session_state.search_results = results
        except Exception as e:
            st.error(f"Search failed: {e}")
            st.session_state.search_results = []

if st.session_state.search_results:
    labels = [r["display_name"] for r in st.session_state.search_results]
    chosen_label = st.selectbox("Pick a result", labels, label_visibility="collapsed")
    chosen = next(r for r in st.session_state.search_results if r["display_name"] == chosen_label)
    if st.button("📍 Go to location", use_container_width=False):
        st.session_state.center = [float(chosen["lat"]), float(chosen["lon"])]
        st.session_state.zoom = 11
        st.session_state.marker = {"latlng": st.session_state.center, "label": chosen_label}
        st.session_state.search_results = []
        st.rerun()

# ── Map + county panel ────────────────────────────────────────────────────────

col_map, col_panel = st.columns([5, 1])

try:
    county_data = load_county_data()
except Exception as e:
    st.error(f"Could not load county boundaries: {e}")
    county_data = None

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
            "fillOpacity": 0.25,
            "color": "#000000",
            "weight": 2.5,
            "opacity": 1.0,
        },
        tooltip=folium.GeoJsonTooltip(
            fields=["NAME", "STATE"],
            aliases=["County:", "State FIPS:"],
            localize=True,
            sticky=True,
            style=(
                "background-color:rgba(0,0,0,0.85);"
                "color:white;font-size:13px;"
                "border-radius:4px;padding:4px 8px;border:none;"
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

with col_map:
    map_data = st_folium(
        m,
        use_container_width=True,
        height=720,
        returned_objects=["last_active_drawing", "center", "zoom"],
    )

# Preserve map position across layer switches
if map_data:
    if map_data.get("center"):
        c = map_data["center"]
        st.session_state.center = [c["lat"], c["lng"]]
    if map_data.get("zoom") is not None:
        st.session_state.zoom = map_data["zoom"]
    # Capture selected county
    if map_data.get("last_active_drawing"):
        props = map_data["last_active_drawing"].get("properties", {})
        name = props.get("NAME", "")
        fips = props.get("STATE", "")
        if name:
            st.session_state.selected_county = {
                "name": name,
                "state": FIPS_TO_STATE.get(fips, fips),
            }

# ── County info panel ─────────────────────────────────────────────────────────

with col_panel:
    sc = st.session_state.selected_county
    if sc:
        st.markdown(
            f"""
            <div style="
                background:rgba(10,10,28,0.95);
                border:1px solid rgba(255,255,255,0.12);
                border-radius:10px;
                padding:18px 14px;
                margin-top:8px;
                text-align:center;
            ">
                <div style="font-size:10px;text-transform:uppercase;
                            letter-spacing:0.1em;color:rgba(255,255,255,0.35);
                            margin-bottom:8px;">Selected County</div>
                <div style="font-size:18px;font-weight:700;color:#fff;
                            line-height:1.3;margin-bottom:8px;">{sc['name']}</div>
                <div style="font-size:32px;font-weight:800;color:#4a90e2;
                            letter-spacing:0.05em;">{sc['state']}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            """
            <div style="
                border:1px dashed rgba(255,255,255,0.1);
                border-radius:10px;padding:16px;margin-top:8px;
                text-align:center;color:rgba(255,255,255,0.25);font-size:12px;
            ">Click a county to see details</div>
            """,
            unsafe_allow_html=True,
        )
