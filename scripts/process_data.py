#!/usr/bin/env python3
"""
Process Yelp academic dataset → public/restaurants.json
Filters to restaurant businesses, joins check-in counts,
extracts price tier, cuisine type, and city density context.
"""

import json
import os
import urllib.request
from collections import defaultdict, Counter

BUSINESS_PATH = os.path.expanduser(
    "~/Downloads/Yelp JSON/yelp_dataset/yelp_academic_dataset_business.json"
)
CHECKIN_PATH = os.path.expanduser(
    "~/Downloads/Yelp JSON/yelp_dataset/yelp_academic_dataset_checkin.json"
)
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "restaurants.json")

# ── Cuisine taxonomy ───────────────────────────────────────────────────────────
CUISINE_MAP = {
    "American (Traditional)": "American",
    "American (New)": "American",
    "Southern": "American",
    "Soul Food": "American",
    "Cajun/Creole": "American",
    "Italian": "Italian",
    "Pizza": "Pizza",
    "Mexican": "Mexican",
    "Tex-Mex": "Mexican",
    "Chinese": "Chinese",
    "Cantonese": "Chinese",
    "Dim Sum": "Chinese",
    "Japanese": "Japanese",
    "Sushi Bars": "Japanese",
    "Ramen": "Japanese",
    "Thai": "Thai",
    "Vietnamese": "Vietnamese",
    "Pho": "Vietnamese",
    "Korean": "Korean",
    "Indian": "Indian",
    "Pakistani": "Indian",
    "Mediterranean": "Mediterranean",
    "Greek": "Mediterranean",
    "Middle Eastern": "Mediterranean",
    "Lebanese": "Mediterranean",
    "French": "French",
    "Spanish": "Spanish",
    "Tapas Bars": "Spanish",
    "Seafood": "Seafood",
    "Steakhouses": "Steakhouses",
    "Burgers": "Burgers",
    "Sandwiches": "Sandwiches",
    "Delis": "Sandwiches",
    "Fast Food": "Fast Food",
    "Chicken Wings": "Fast Food",
    "Hot Dogs": "Fast Food",
    "Diners": "Diners & Cafes",
    "Breakfast & Brunch": "Diners & Cafes",
    "Cafes": "Diners & Cafes",
    "Coffee & Tea": "Diners & Cafes",
    "Bakeries": "Bakeries & Desserts",
    "Desserts": "Bakeries & Desserts",
    "Ice Cream & Frozen Yogurt": "Bakeries & Desserts",
    "Bars": "Bars & Nightlife",
    "Pubs": "Bars & Nightlife",
    "Sports Bars": "Bars & Nightlife",
    "Nightlife": "Bars & Nightlife",
    "Salad": "Healthy",
    "Vegetarian": "Healthy",
    "Vegan": "Healthy",
    "Gluten-Free": "Healthy",
    "Caribbean": "Caribbean & Latin",
    "Cuban": "Caribbean & Latin",
    "Latin American": "Caribbean & Latin",
    "Peruvian": "Caribbean & Latin",
    "Ethiopian": "African",
    "African": "African",
}

RESTAURANT_INDICATORS = {
    "Restaurants", "Food", "Food Stands", "Food Trucks", "Caterers",
    "Pizza", "Burgers", "Sandwiches", "Seafood", "Steakhouses",
    "Fast Food", "Diners", "Breakfast & Brunch", "Cafes",
    "Bars", "Nightlife", "Bakeries", "Desserts",
}

def extract_cuisine(categories_str):
    if not categories_str:
        return "Other"
    cats = [c.strip() for c in categories_str.split(",")]
    for cat in cats:
        if cat in CUISINE_MAP:
            return CUISINE_MAP[cat]
    return "Other"

def is_restaurant(categories_str):
    if not categories_str:
        return False
    cats = {c.strip() for c in categories_str.split(",")}
    return bool(cats & RESTAURANT_INDICATORS)

def extract_price(attrs):
    if not attrs:
        return None
    val = attrs.get("RestaurantsPriceRange2")
    if val in ("1", "2", "3", "4"):
        return int(val)
    return None

def has_delivery(attrs):
    if not attrs:
        return False
    val = attrs.get("RestaurantsDelivery", "False")
    return str(val).lower() in ("true", "'true'")

# ── Step 1: Build check-in count index ────────────────────────────────────────
print("Loading check-in data...")
checkin_counts = {}
with open(CHECKIN_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        bid = obj["business_id"]
        dates_str = obj.get("date", "")
        count = len(dates_str.split(",")) if dates_str else 0
        checkin_counts[bid] = count
print(f"  {len(checkin_counts):,} businesses have check-ins")

# ── Step 2: Filter restaurants from business dataset ─────────────────────────
FOCUS_STATES = {"PA", "NJ"}   # Philadelphia + South Jersey region only

print(f"Loading business data (states: {', '.join(sorted(FOCUS_STATES))})...")
restaurants = []
city_counter = Counter()

with open(BUSINESS_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        b = json.loads(line)

        # Region filter first — cheap string check before everything else
        state = b.get("state", "").strip()
        if state not in FOCUS_STATES:
            continue

        if not is_restaurant(b.get("categories", "")):
            continue
        if b.get("latitude") is None or b.get("longitude") is None:
            continue

        lat = b["latitude"]
        lng = b["longitude"]
        if lat == 0.0 and lng == 0.0:
            continue

        city = b.get("city", "Unknown").strip()
        attrs = b.get("attributes") or {}

        cuisine = extract_cuisine(b.get("categories", ""))
        price = extract_price(attrs)
        delivery = has_delivery(attrs)
        checkins = checkin_counts.get(b["business_id"], 0)

        city_counter[city] += 1

        restaurants.append({
            "name":     b["name"],
            "city":     city,
            "state":    state,
            "lat":      round(lat, 5),
            "lng":      round(lng, 5),
            "stars":    b.get("stars"),
            "reviews":  b.get("review_count", 0),
            "checkins": checkins,
            "price":    price,
            "cuisine":  cuisine,
            "open":     b.get("is_open", 0),
            "delivery": delivery,
        })

print(f"  {len(restaurants):,} restaurants found")

# ── Step 3: Coordinate-based density classification ──────────────────────────
# Use a geographic grid instead of city names.
# Each ~0.05° cell ≈ 4–5 km side. Count restaurants per cell, then classify
# each restaurant by how dense its own cell is. This correctly marks a
# restaurant in a small municipality inside the Philadelphia metro as "urban"
# because its grid cell is packed with neighbours.
GRID = 0.05  # degrees per cell side

print("Computing coordinate-based density...")
grid_counts: dict[tuple, int] = defaultdict(int)
for r in restaurants:
    cell = (round(r["lat"] / GRID) * GRID, round(r["lng"] / GRID) * GRID)
    grid_counts[cell] += 1

# Thresholds tuned to this dataset's grid resolution
URBAN_GRID    = 30   # ≥ 30 restaurants in the same ~5km cell → urban
SUBURBAN_GRID = 8    # ≥  8 → suburban

def grid_density(lat, lng):
    cell = (round(lat / GRID) * GRID, round(lng / GRID) * GRID)
    n = grid_counts[cell]
    if n >= URBAN_GRID:    return "urban"
    if n >= SUBURBAN_GRID: return "suburban"
    return "rural"

density_counts = Counter(grid_density(r["lat"], r["lng"]) for r in restaurants)
print(f"  Urban: {density_counts['urban']:,}  "
      f"Suburban: {density_counts['suburban']:,}  "
      f"Rural: {density_counts['rural']:,}  (for reference only — not written to output)")

# ── Step 4: Build scope metadata ─────────────────────────────────────────────
top_cities = [city for city, _ in city_counter.most_common(100)]
delivery_count = sum(1 for r in restaurants if r["delivery"])
open_count = sum(1 for r in restaurants if r["open"])

scope = {
    "total":           len(restaurants),
    "cities":          len(city_counter),
    "top_cities":      top_cities,
    "delivery_count":  delivery_count,
    "open_count":      open_count,
    "date_note":       "Yelp Academic Dataset (historical snapshot, ~2019–2022 era) · Pennsylvania & New Jersey only",
    "delivery_note":   "Delivery flag based on business attributes; not all delivery-only ops are flagged",
}

cuisines_available = sorted(set(r["cuisine"] for r in restaurants))
states_available   = sorted(set(r["state"]   for r in restaurants))
prices_available   = sorted(set(r["price"]   for r in restaurants if r["price"]))

# ── Step 5: Write output ──────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
output = {
    "restaurants": restaurants,
    "scope":       scope,
    "meta": {
        "cuisines": cuisines_available,
        "states":   states_available,
        "prices":   prices_available,
    }
}

print(f"Writing {OUT_PATH} ...")
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, separators=(",", ":"))

size_mb = os.path.getsize(OUT_PATH) / (1024 * 1024)
print(f"Done. {len(restaurants):,} restaurants, {size_mb:.1f} MB")
print(f"Cities: {len(city_counter):,}  |  Cuisines: {len(cuisines_available)}")

# ── Step 6: Download PA + NJ state boundaries for map mask ────────────────────
REGION_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "region.geojson")
STATES_URL  = (
    "https://raw.githubusercontent.com/PublicaMundi/MappingAPI"
    "/master/data/geojson/us-states.json"
)

print("\nDownloading PA & NJ state boundaries...")
try:
    with urllib.request.urlopen(STATES_URL, timeout=30) as resp:
        all_states = json.loads(resp.read())

    target_names = {"Pennsylvania", "New Jersey"}
    features = [
        f for f in all_states["features"]
        if f.get("properties", {}).get("name") in target_names
    ]

    if len(features) != 2:
        # Try uppercase key as fallback
        features = [
            f for f in all_states["features"]
            if f.get("properties", {}).get("NAME") in target_names
        ]

    with open(REGION_PATH, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features},
                  f, separators=(",", ":"))

    found = [f["properties"].get("name") or f["properties"].get("NAME") for f in features]
    print(f"  Saved: {', '.join(found)} → {REGION_PATH}")
except Exception as e:
    print(f"  Warning: could not download state boundaries ({e})")
