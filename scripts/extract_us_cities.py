#!/usr/bin/env python3
"""
Extract top cities + state totals from the full Yelp dataset (all states).
Outputs public/us_overview.json
"""
import json, os, urllib.request
from collections import Counter

BUSINESS_PATH = os.path.expanduser(
    "~/Downloads/Yelp JSON/yelp_dataset/yelp_academic_dataset_business.json"
)
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "us_overview.json")

RESTAURANT_INDICATORS = {
    "Restaurants", "Food", "Food Stands", "Food Trucks",
    "Pizza", "Burgers", "Sandwiches", "Seafood", "Steakhouses",
    "Fast Food", "Diners", "Breakfast & Brunch", "Cafes",
    "Bars", "Nightlife", "Bakeries", "Desserts",
}

FRANCHISE_PREFIXES = {
    "mcdonald", "burger king", "wendy's", "wendys", "jack in the box",
    "sonic drive", "hardee's", "hardees", "carl's jr", "carls jr",
    "white castle", "in-n-out", "whataburger", "five guys", "shake shack",
    "smashburger", "culver's", "culvers", "steak 'n shake", "steak n shake",
    "rally's", "rallys", "checkers", "kfc", "popeyes", "popeye's",
    "chick-fil-a", "chick fil a", "church's chicken", "raising cane",
    "wingstop", "wing zone", "buffalo wild wings", "zaxby's", "bojangles",
    "pizza hut", "domino's", "dominos", "papa john", "little caesars",
    "papa murphy", "round table pizza", "cicis", "cici's",
    "subway", "quiznos", "jimmy john", "jersey mike", "firehouse subs",
    "which wich", "potbelly", "blimpie", "charley's grilled", "charleys",
    "taco bell", "chipotle", "qdoba", "moe's southwest", "moes southwest",
    "del taco", "taco john", "el pollo loco", "baja fresh",
    "starbucks", "dunkin", "tim hortons", "peet's coffee", "peets coffee",
    "dutch bros", "caribou coffee", "biggby",
    "applebee's", "applebees", "chili's", "chilis", "tgi friday",
    "red robin", "ruby tuesday", "denny's", "dennys", "ihop", "perkins",
    "bob evans", "cracker barrel", "golden corral", "sizzler",
    "outback steakhouse", "longhorn steakhouse", "texas roadhouse",
    "red lobster", "olive garden", "cheesecake factory", "hooters",
    "waffle house", "first watch", "friendly's", "friendlys",
    "carrabba's", "carrabbas", "buca di beppo", "macaroni grill",
    "fazoli's", "sbarro", "panda express", "p.f. chang", "pf chang",
    "benihana", "ruth's chris", "ruths chris", "morton's",
    "long john silver", "captain d's", "captain ds",
    "panera bread", "panera", "corner bakery", "au bon pain",
    "jason's deli", "jasons deli", "einstein bros", "bruegger's",
    "baskin-robbins", "baskin robbins", "cold stone creamery", "dairy queen",
    "carvel", "marble slab", "krispy kreme", "tcby", "yogurtland",
    "menchie's", "pinkberry", "smoothie king", "jamba juice",
    "tropical smoothie", "famous dave's", "dickey's barbecue",
    "arby's", "arbys", "mcalister's deli", "noodles & company",
    "noodles and company", "a&w", "mission bbq",
}

def is_restaurant(cats):
    if not cats: return False
    return bool({c.strip() for c in cats.split(",")} & RESTAURANT_INDICATORS)

def is_franchise(name):
    n = name.lower().strip()
    return any(n.startswith(p) for p in FRANCHISE_PREFIXES)

print("Scanning full dataset...")
city_state_counts = Counter()        # (city, state) → count
city_coords       = {}               # (city, state) → [sum_lat, sum_lng, n]
state_counts      = Counter()        # state → count
total = 0

with open(BUSINESS_PATH, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line: continue
        b = json.loads(line)
        if not is_restaurant(b.get("categories", "")): continue
        if is_franchise(b.get("name", "")): continue
        city  = b.get("city",  "Unknown").strip()
        state = b.get("state", "Unknown").strip()
        lat   = b.get("latitude")
        lng   = b.get("longitude")
        if not city or not state: continue
        city_state_counts[(city, state)] += 1
        state_counts[state] += 1
        total += 1
        if lat and lng and lat != 0.0 and lng != 0.0:
            key = (city, state)
            if key not in city_coords:
                city_coords[key] = [0.0, 0.0, 0]
            city_coords[key][0] += lat
            city_coords[key][1] += lng
            city_coords[key][2] += 1

print(f"  {total:,} independent restaurants across {len(state_counts)} states/regions")

# Top 15 cities overall — include averaged lat/lng
top_cities = []
for (city, state), n in city_state_counts.most_common(15):
    coords = city_coords.get((city, state))
    lat = round(coords[0] / coords[2], 4) if coords and coords[2] else None
    lng = round(coords[1] / coords[2], 4) if coords and coords[2] else None
    top_cities.append({"city": city, "state": state, "n": n, "lat": lat, "lng": lng})

# Top states
top_states = [
    {"state": state, "n": n}
    for state, n in state_counts.most_common(15)
]

print("\nTop 15 cities:")
for row in top_cities:
    print(f"  {row['city']}, {row['state']}: {row['n']:,}")

print("\nTop states:")
for row in top_states[:8]:
    print(f"  {row['state']}: {row['n']:,}")

output = {
    "total": total,
    "top_cities": top_cities,
    "top_states": top_states,
}

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2)

print(f"\nWrote {OUT_PATH}")

# Download compact US states GeoJSON for map background
STATES_OUT = os.path.join(os.path.dirname(__file__), "..", "public", "us_states.json")
STATES_URL = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"
print("\nDownloading US states GeoJSON...")
try:
    with urllib.request.urlopen(STATES_URL, timeout=30) as r:
        states_data = json.loads(r.read())
    with open(STATES_OUT, "w", encoding="utf-8") as f:
        json.dump(states_data, f, separators=(",", ":"))
    print(f"  Saved {len(states_data['features'])} features → {STATES_OUT}")
except Exception as e:
    print(f"  Warning: could not download ({e})")
