#!/usr/bin/env python3
"""
Process Yelp academic dataset → public/restaurants.json
Filters to restaurant businesses, joins check-in counts,
extracts price tier, cuisine type, and city density context.
"""

import json
import os
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
print("Loading business data...")
restaurants = []
city_counter = Counter()
min_date = None
max_date = None

with open(BUSINESS_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        b = json.loads(line)

        if not is_restaurant(b.get("categories", "")):
            continue
        if b.get("latitude") is None or b.get("longitude") is None:
            continue

        lat = b["latitude"]
        lng = b["longitude"]
        # Skip clearly bad coordinates
        if lat == 0.0 and lng == 0.0:
            continue

        city = b.get("city", "Unknown").strip()
        state = b.get("state", "").strip()
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

# ── Step 3: Annotate urban/rural context ─────────────────────────────────────
# Classify cities by restaurant density in the dataset
URBAN_THRESHOLD  = 500   # ≥500 restaurants → urban
SUBURBAN_THRESHOLD = 100 # ≥100 → suburban, else rural

def city_density(count):
    if count >= URBAN_THRESHOLD:
        return "urban"
    elif count >= SUBURBAN_THRESHOLD:
        return "suburban"
    return "rural"

for r in restaurants:
    r["density"] = city_density(city_counter[r["city"]])

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
    "date_note":       "Yelp Academic Dataset (historical snapshot, ~2019–2022 era)",
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
