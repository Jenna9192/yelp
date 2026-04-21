"""
Yelp Sweet Spot — Data Preprocessor
====================================
Reads the Yelp Open Dataset JSON files and outputs a slim `restaurants.json`
optimized for the React scatter plot component.

Usage:
    python preprocess_for_scatter.py

Expects in current directory:
    - yelp_academic_dataset_business.json
    - yelp_academic_dataset_checkin.json

Outputs:
    - restaurants.json  (array of restaurant records, ready for the React app)
"""

import json
import os
from collections import Counter

BUSINESS_FILE = "yelp_academic_dataset_business.json"
CHECKIN_FILE = "yelp_academic_dataset_checkin.json"
OUTPUT_FILE = "restaurants.json"

FOOD_KEYWORDS = {
    "Restaurants", "Food", "Bars", "Cafes", "Coffee & Tea",
    "Bakeries", "Pizza", "Breakfast & Brunch", "Sandwiches",
    "Burgers", "Seafood", "Ice Cream & Frozen Yogurt",
    "Fast Food", "Delis", "Sushi Bars",
}

CUISINE_BUCKETS = {
    "Italian": ["Italian", "Pizza", "Pasta"],
    "Mexican": ["Mexican", "Tacos", "Tex-Mex"],
    "Chinese": ["Chinese", "Dim Sum", "Cantonese", "Szechuan"],
    "Japanese": ["Japanese", "Sushi Bars", "Ramen"],
    "Thai": ["Thai"],
    "Indian": ["Indian", "Pakistani"],
    "American": ["American (Traditional)", "American (New)", "Burgers", "Diners"],
    "Mediterranean": ["Mediterranean", "Greek", "Middle Eastern", "Lebanese"],
    "Vietnamese": ["Vietnamese", "Pho"],
    "Korean": ["Korean"],
    "Seafood": ["Seafood", "Fish & Chips"],
    "BBQ": ["Barbeque", "BBQ"],
    "Cafes & Bakeries": ["Cafes", "Coffee & Tea", "Bakeries", "Breakfast & Brunch"],
    "Bars & Pubs": ["Bars", "Pubs", "Sports Bars", "Wine Bars"],
    "Fast Food": ["Fast Food"],
    "Desserts": ["Ice Cream & Frozen Yogurt", "Desserts"],
}

def is_food_business(categories):
    if not isinstance(categories, str):
        return False
    cats = {c.strip() for c in categories.split(",")}
    return bool(cats & FOOD_KEYWORDS)

def get_cuisine(categories):
    if not isinstance(categories, str):
        return "Other"
    cats = {c.strip() for c in categories.split(",")}
    for bucket, keywords in CUISINE_BUCKETS.items():
        if any(k in cats for k in keywords):
            return bucket
    return "Other"

def get_price_range(attrs):
    if not isinstance(attrs, dict):
        return None
    val = attrs.get("RestaurantsPriceRange2")
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


print("Step 1: Loading check-in counts...")
checkin_counts = {}
with open(CHECKIN_FILE, "r", encoding="utf-8") as f:
    for line in f:
        row = json.loads(line)
        bid = row.get("business_id")
        dates = row.get("date", "")
        if bid and isinstance(dates, str):
            checkin_counts[bid] = len(dates.split(","))
print(f"  Loaded check-ins for {len(checkin_counts):,} businesses")


def standardize_city(city):
    """Normalize city names: title case, strip whitespace, fix common variants."""
    if not isinstance(city, str):
        return "Unknown"
    city = city.strip().title()
    # Merge known duplicates
    fixes = {
        "Phila": "Philadelphia",
        "Philly": "Philadelphia",
        "S Philadelphia": "Philadelphia",
        "N Philadelphia": "Philadelphia",
        "W Philadelphia": "Philadelphia",
        "E Philadelphia": "Philadelphia",
        "Mt Laurel": "Mount Laurel",
        "Mt. Laurel": "Mount Laurel",
        "Mc Kees Rocks": "McKees Rocks",
        "Mckees Rocks": "McKees Rocks",
        "King Of Prussia": "King Of Prussia",
        "N. Brunswick": "North Brunswick",
        "S. Brunswick": "South Brunswick",
        "St. Louis": "Saint Louis",
        "St Louis": "Saint Louis",
    }
    return fixes.get(city, city)


print("Step 2: Processing businesses...")
restaurants = []
with open(BUSINESS_FILE, "r", encoding="utf-8") as f:
    for line in f:
        row = json.loads(line)
        if not is_food_business(row.get("categories")):
            continue
        price = get_price_range(row.get("attributes"))
        if price is None:
            continue
        bid = row["business_id"]
        restaurants.append({
            "id": bid,
            "name": row["name"],
            "city": standardize_city(row["city"]),
            "state": row["state"],
            "stars": row["stars"],
            "reviews": row["review_count"],
            "checkins": checkin_counts.get(bid, 0),
            "price": price,
            "cuisine": get_cuisine(row.get("categories")),
        })
print(f"  Kept {len(restaurants):,} restaurants with price data")


print("Step 3: Top cuisines / cities (for filter UI)")
cuisine_counts = Counter(r["cuisine"] for r in restaurants)
city_counts = Counter(r["city"] for r in restaurants)
print(f"  Top cuisines: {cuisine_counts.most_common(10)}")
print(f"  Top cities: {city_counts.most_common(10)}")


print(f"Step 4: Writing {OUTPUT_FILE}...")
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(restaurants, f, separators=(",", ":"))
size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
print(f"  Wrote {len(restaurants):,} records ({size_mb:.1f} MB)")
print("\nDone! Drop restaurants.json next to your React app.")