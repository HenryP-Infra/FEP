import math
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

st.markdown(
    """
    <style>
    #root > div:first-child { padding-top: 0; }
    .block-container { padding: 0.5rem 1rem 0 !important; max-width: 100% !important; }
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

TERRAIN_TILES = "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
TERRAIN_ATTR  = "© Google Maps"

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

US_STATES = [
    ("01","Alabama","AL"),("02","Alaska","AK"),("04","Arizona","AZ"),
    ("05","Arkansas","AR"),("06","California","CA"),("08","Colorado","CO"),
    ("09","Connecticut","CT"),("10","Delaware","DE"),("11","DC","DC"),
    ("12","Florida","FL"),("13","Georgia","GA"),("15","Hawaii","HI"),
    ("16","Idaho","ID"),("17","Illinois","IL"),("18","Indiana","IN"),
    ("19","Iowa","IA"),("20","Kansas","KS"),("21","Kentucky","KY"),
    ("22","Louisiana","LA"),("23","Maine","ME"),("24","Maryland","MD"),
    ("25","Massachusetts","MA"),("26","Michigan","MI"),("27","Minnesota","MN"),
    ("28","Mississippi","MS"),("29","Missouri","MO"),("30","Montana","MT"),
    ("31","Nebraska","NE"),("32","Nevada","NV"),("33","New Hampshire","NH"),
    ("34","New Jersey","NJ"),("35","New Mexico","NM"),("36","New York","NY"),
    ("37","North Carolina","NC"),("38","North Dakota","ND"),("39","Ohio","OH"),
    ("40","Oklahoma","OK"),("41","Oregon","OR"),("42","Pennsylvania","PA"),
    ("44","Rhode Island","RI"),("45","South Carolina","SC"),("46","South Dakota","SD"),
    ("47","Tennessee","TN"),("48","Texas","TX"),("49","Utah","UT"),
    ("50","Vermont","VT"),("51","Virginia","VA"),("53","Washington","WA"),
    ("54","West Virginia","WV"),("55","Wisconsin","WI"),("56","Wyoming","WY"),
]

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# ── Mock permit generator ─────────────────────────────────────────────────────

PERMIT_TYPES   = ["Building","Electrical","Plumbing","Mechanical","Grading","Demolition","Roofing","HVAC"]
PERMIT_STATUS  = ["Issued","Pending","Approved","Under Review","Expired","Finaled","Denied"]
PERMIT_DESCS   = [
    "New Single Family Residence","Commercial Tenant Improvement",
    "Residential Addition / Remodel","HVAC System Replacement",
    "Roof Replacement","Electrical Panel Upgrade",
    "Plumbing Remodel – Kitchen & Bath","Accessory Dwelling Unit (ADU)",
    "Deck / Patio Construction","Solar Panel Installation",
]
PERMIT_STREETS = ["Main St","Oak Ave","Elm Dr","Pine Rd","Maple Ln","Cedar Blvd","Park Way","Lake Dr"]

STATUS_COLORS = {
    "Issued":"🟢","Approved":"🟢","Finaled":"🟢",
    "Pending":"🟡","Under Review":"🟡",
    "Expired":"🔴","Denied":"🔴",
}

def _hash(text):
    h = 5381
    for c in str(text):
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
    return h

def generate_permits(county_name, state_abbr, count=10):
    base = _hash(f"{county_name}{state_abbr}")
    rows = []
    for i in range(count):
        s  = _hash(f"{base}{i}")
        s2 = _hash(f"{s}x")
        year  = 2022 + (s % 3)
        month = 1 + (s2 % 12)
        day   = 1 + ((s >> 4) % 28)
        ptype  = PERMIT_TYPES[s  % len(PERMIT_TYPES)]
        status = PERMIT_STATUS[s2 % len(PERMIT_STATUS)]
        desc   = PERMIT_DESCS[_hash(f"{s}d") % len(PERMIT_DESCS)]
        street = PERMIT_STREETS[s2 % len(PERMIT_STREETS)]
        rows.append({
            "Permit #":    f"{state_abbr}-{year}-{s % 100000:05d}",
            "Type":        ptype,
            "Description": desc,
            "Status":      f"{STATUS_COLORS.get(status,'⚪')} {status}",
            "Date Filed":  f"{year}-{month:02d}-{day:02d}",
            "Address":     f"{100 + s % 1900} {street}, {county_name}, {state_abbr}",
        })
    return rows

# ── Cached data loaders ───────────────────────────────────────────────────────

@st.cache_data(show_spinner="Loading county boundaries…")
def load_county_data():
    resp = requests.get(COUNTY_GEOJSON_URL, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    for feature in data["features"]:
        props = feature["properties"]
        name  = props.get("NAME", "")
        abbr  = FIPS_TO_STATE.get(props.get("STATE", ""), "")
        props["LABEL"] = f"{name} County, {abbr}"
    return data

@st.cache_data(show_spinner=False)
def get_county_list(state_fips: str):
    data = load_county_data()
    return sorted(
        f["properties"]["NAME"]
        for f in data["features"]
        if f["properties"].get("STATE") == state_fips
    )

# ── Session state ─────────────────────────────────────────────────────────────

def _init():
    for k, v in {
        "center":          [39.5, -98.35],
        "zoom":            4,
        "selected_county": None,
    }.items():
        if k not in st.session_state:
            st.session_state[k] = v

_init()

# ── Top bar ───────────────────────────────────────────────────────────────────

st.markdown(
    "<h3 style='margin:0 0 8px;color:#fff;font-size:16px;font-weight:700;'>"
    "🗺️ US County Map</h3>",
    unsafe_allow_html=True,
)

state_options  = {name: fips for fips, name, _ in US_STATES}
col_state, col_county = st.columns([2, 3])

with col_state:
    selected_state_name = st.selectbox(
        "State",
        options=["— Select state —"] + [name for _, name, _ in US_STATES],
        label_visibility="collapsed",
    )

selected_state_fips = state_options.get(selected_state_name) if selected_state_name != "— Select state —" else None
selected_state_abbr = next((a for f, n, a in US_STATES if f == selected_state_fips), "") if selected_state_fips else ""

with col_county:
    if selected_state_fips:
        county_list = get_county_list(selected_state_fips)
        selected_county_name = st.selectbox(
            "County",
            options=["— Select county —"] + county_list,
            label_visibility="collapsed",
        )
        if selected_county_name != "— Select county —":
            st.session_state.selected_county = {
                "name":       selected_county_name,
                "state_abbr": selected_state_abbr,
            }
    else:
        st.selectbox("County", ["— Select state first —"],
                     disabled=True, label_visibility="collapsed")

# ── Build map ─────────────────────────────────────────────────────────────────

try:
    county_data = load_county_data()
except Exception as e:
    st.error(f"Could not load county boundaries: {e}")
    county_data = None

m = folium.Map(
    location=st.session_state.center,
    zoom_start=st.session_state.zoom,
    tiles=TERRAIN_TILES,
    attr=TERRAIN_ATTR,
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
        tooltip=folium.GeoJsonTooltip(
            fields=["LABEL"],
            aliases=[""],
            labels=False,
            localize=True,
            sticky=True,
            style=(
                "background-color:rgba(0,0,0,0.85);color:white;"
                "font-size:13px;border-radius:4px;padding:4px 8px;border:none;"
            ),
        ),
    ).add_to(m)

# Zoom map to selected county's approximate centroid
sc = st.session_state.selected_county
if sc and county_data:
    feature = next(
        (f for f in county_data["features"]
         if f["properties"].get("NAME") == sc["name"]
         and FIPS_TO_STATE.get(f["properties"].get("STATE","")) == sc["state_abbr"]),
        None,
    )
    if feature:
        coords = feature["geometry"].get("coordinates", [])
        # Rough centroid from first polygon ring
        try:
            ring = coords[0][0] if feature["geometry"]["type"] == "MultiPolygon" else coords[0]
            lats = [p[1] for p in ring]
            lons = [p[0] for p in ring]
            st.session_state.center = [sum(lats)/len(lats), sum(lons)/len(lons)]
            st.session_state.zoom   = 9
        except Exception:
            pass
        # Highlight selected county
        folium.GeoJson(
            feature,
            style_function=lambda _: {
                "fillColor": "#3b82f6",
                "fillOpacity": 0.25,
                "color": "#000000",
                "weight": 2.5,
                "opacity": 1.0,
            },
        ).add_to(m)

map_data = st_folium(
    m,
    use_container_width=True,
    height=580,
    returned_objects=["center", "zoom"],
)

if map_data:
    if map_data.get("center"):
        c = map_data["center"]
        st.session_state.center = [c["lat"], c["lng"]]
    if map_data.get("zoom") is not None:
        st.session_state.zoom = map_data["zoom"]

# ── Permits panel ─────────────────────────────────────────────────────────────

if sc:
    st.markdown("---")
    st.markdown(
        f"### Permits — **{sc['name']} County, {sc['state_abbr']}**"
        f"<span style='font-size:12px;color:gray;'> &nbsp;(sample data)</span>",
        unsafe_allow_html=True,
    )

    permits = generate_permits(sc["name"], sc["state_abbr"])
    st.dataframe(
        permits,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Permit #":    st.column_config.TextColumn("Permit #",    width="small"),
            "Type":        st.column_config.TextColumn("Type",        width="small"),
            "Description": st.column_config.TextColumn("Description", width="medium"),
            "Status":      st.column_config.TextColumn("Status",      width="small"),
            "Date Filed":  st.column_config.TextColumn("Date Filed",  width="small"),
            "Address":     st.column_config.TextColumn("Address",     width="medium"),
        },
    )
else:
    st.markdown(
        "<div style='text-align:center;color:rgba(255,255,255,0.25);"
        "padding:24px;font-size:13px;'>Select a state and county to view permit documents</div>",
        unsafe_allow_html=True,
    )
