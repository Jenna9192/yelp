#!/usr/bin/env python3
"""
PA/NJ Restaurant Survival Analysis
────────────────────────────────────
Logistic regression predicting is_open (restaurant still operating)
from rating, volume, amenity flags, cuisine, price tier, and density.

Outputs public/survival_model.json for the website Finale section.

Usage:
    python scripts/survival_analysis.py

Requirements:
    pip install scikit-learn numpy
    (pandas optional — not required)
"""

import json
import os
import math
from collections import Counter, defaultdict

# ── Paths ─────────────────────────────────────────────────────────────────────
BUSINESS_PATH = os.path.expanduser(
    "~/Downloads/Yelp JSON/yelp_dataset/yelp_academic_dataset_business.json"
)
CHECKIN_PATH = os.path.expanduser(
    "~/Downloads/Yelp JSON/yelp_dataset/yelp_academic_dataset_checkin.json"
)
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "survival_model.json")

FOCUS_STATES = {"PA", "NJ"}

# ── Cuisine taxonomy (same as process_data.py) ────────────────────────────────
CUISINE_MAP = {
    "American (Traditional)": "American", "American (New)": "American",
    "Southern": "American", "Soul Food": "American", "Cajun/Creole": "American",
    "Italian": "Italian", "Pizza": "Pizza", "Mexican": "Mexican",
    "Tex-Mex": "Mexican", "Chinese": "Chinese", "Cantonese": "Chinese",
    "Dim Sum": "Chinese", "Japanese": "Japanese", "Sushi Bars": "Japanese",
    "Ramen": "Japanese", "Thai": "Thai", "Vietnamese": "Vietnamese",
    "Pho": "Vietnamese", "Korean": "Korean", "Indian": "Indian",
    "Pakistani": "Indian", "Mediterranean": "Mediterranean", "Greek": "Mediterranean",
    "Middle Eastern": "Mediterranean", "Lebanese": "Mediterranean",
    "French": "French", "Spanish": "Spanish", "Tapas Bars": "Spanish",
    "Seafood": "Seafood", "Steakhouses": "Steakhouses", "Burgers": "Burgers",
    "Sandwiches": "Sandwiches", "Delis": "Sandwiches", "Fast Food": "Fast Food",
    "Chicken Wings": "Fast Food", "Hot Dogs": "Fast Food",
    "Diners": "Diners & Cafes", "Breakfast & Brunch": "Diners & Cafes",
    "Cafes": "Diners & Cafes", "Coffee & Tea": "Diners & Cafes",
    "Bakeries": "Bakeries & Desserts", "Desserts": "Bakeries & Desserts",
    "Ice Cream & Frozen Yogurt": "Bakeries & Desserts",
    "Bars": "Bars & Nightlife", "Pubs": "Bars & Nightlife",
    "Sports Bars": "Bars & Nightlife", "Nightlife": "Bars & Nightlife",
    "Salad": "Healthy", "Vegetarian": "Healthy", "Vegan": "Healthy",
    "Gluten-Free": "Healthy", "Caribbean": "Caribbean & Latin",
    "Cuban": "Caribbean & Latin", "Latin American": "Caribbean & Latin",
    "Peruvian": "Caribbean & Latin", "Ethiopian": "African", "African": "African",
}

RESTAURANT_INDICATORS = {
    "Restaurants", "Food", "Food Stands", "Food Trucks", "Caterers",
    "Pizza", "Burgers", "Sandwiches", "Seafood", "Steakhouses",
    "Fast Food", "Diners", "Breakfast & Brunch", "Cafes",
    "Bars", "Nightlife", "Bakeries", "Desserts",
}


def extract_cuisine(cats_str):
    if not cats_str:
        return "Other"
    for cat in [c.strip() for c in cats_str.split(",")]:
        if cat in CUISINE_MAP:
            return CUISINE_MAP[cat]
    return "Other"


def is_restaurant(cats_str):
    if not cats_str:
        return False
    return bool({c.strip() for c in cats_str.split(",")} & RESTAURANT_INDICATORS)


FRANCHISE_PREFIXES = {
    "mcdonald", "burger king", "wendy's", "wendys", "jack in the box",
    "sonic drive", "hardee's", "hardees", "carl's jr", "carls jr",
    "white castle", "in-n-out", "whataburger", "five guys", "shake shack",
    "smashburger", "fuddruckers", "culver's", "culvers", "steak 'n shake",
    "steak n shake", "rally's", "rallys", "checkers", "cook out",
    "kfc", "popeyes", "popeye's", "chick-fil-a", "chick fil a",
    "church's chicken", "raising cane", "wingstop", "wing zone",
    "buffalo wild wings", "zaxby's", "bojangles",
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
    "fazoli's", "sbarro", "pizza inn",
    "panda express", "p.f. chang", "pf chang", "benihana",
    "ruth's chris", "ruths chris", "morton's", "mortons steakhouse",
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

def is_franchise(name):
    n = name.lower().strip()
    return any(n.startswith(p) for p in FRANCHISE_PREFIXES)

def bool_attr(attrs, key):
    """Return 1.0 if attribute is truthy, else 0.0."""
    if not attrs:
        return 0.0
    val = str(attrs.get(key, "False")).lower().strip("'\"")
    return 1.0 if val in ("true", "1") else 0.0


def price_attr(attrs):
    if not attrs:
        return None
    val = attrs.get("RestaurantsPriceRange2")
    if val in ("1", "2", "3", "4", 1, 2, 3, 4):
        return int(str(val))
    return None


# ── Step 1: Load check-in counts ──────────────────────────────────────────────
print("Loading check-in data...")
checkin_counts = {}
with open(CHECKIN_PATH, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        bid = obj["business_id"]
        dates_str = obj.get("date", "")
        checkin_counts[bid] = len(dates_str.split(",")) if dates_str else 0
print(f"  {len(checkin_counts):,} businesses with check-ins")

# ── Step 2: Load PA/NJ restaurants ───────────────────────────────────────────
print("Loading businesses (PA + NJ)...")
records = []

with open(BUSINESS_PATH, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        b = json.loads(line)
        if b.get("state", "").strip() not in FOCUS_STATES:
            continue
        if not is_restaurant(b.get("categories", "")):
            continue
        if is_franchise(b.get("name", "")):
            continue
        lat = b.get("latitude")
        lng = b.get("longitude")
        if lat is None or lng is None or (lat == 0.0 and lng == 0.0):
            continue

        attrs = b.get("attributes") or {}
        checkins = checkin_counts.get(b["business_id"], 0)
        price = price_attr(attrs)

        records.append({
            "business_id": b["business_id"],
            "is_open":     int(b.get("is_open", 0)),
            "stars":       float(b.get("stars") or 0),
            "reviews":     int(b.get("review_count") or 0),
            "checkins":    checkins,
            "price":       price,
            "cuisine":     extract_cuisine(b.get("categories", "")),
            "city":        b.get("city", "Unknown").strip(),
            "state":       b.get("state", "").strip(),
            "lat":         lat,
            "lng":         lng,
            # Amenity flags
            "outdoor_seating":   bool_attr(attrs, "OutdoorSeating"),
            "delivery":          bool_attr(attrs, "RestaurantsDelivery"),
            "takeout":           bool_attr(attrs, "RestaurantsTakeOut"),
            "reservations":      bool_attr(attrs, "RestaurantsReservations"),
            "wifi":              1.0 if str(attrs.get("WiFi", "no")).lower().strip("'\"") in ("free", "paid") else 0.0,
            "good_for_groups":   bool_attr(attrs, "RestaurantsGoodForGroups"),
            "good_for_kids":     bool_attr(attrs, "GoodForKids"),
            "has_tv":            bool_attr(attrs, "HasTV"),
            "bike_parking":      bool_attr(attrs, "BikeParking"),
            "caters":            bool_attr(attrs, "Caters"),
        })

print(f"  {len(records):,} restaurants loaded")

# ── Step 3: Coordinate-based density ─────────────────────────────────────────
GRID = 0.05
grid_counts: dict = defaultdict(int)
for r in records:
    cell = (round(r["lat"] / GRID) * GRID, round(r["lng"] / GRID) * GRID)
    grid_counts[cell] += 1

def grid_density(lat, lng):
    n = grid_counts[(round(lat / GRID) * GRID, round(lng / GRID) * GRID)]
    if n >= 30: return "urban"
    if n >= 8:  return "suburban"
    return "rural"

for r in records:
    r["density"] = grid_density(r["lat"], r["lng"])

# ── Step 4: Build feature matrix ──────────────────────────────────────────────
# Continuous: stars, log(reviews+1), log(checkins+1), price (mean-filled)
# Binary amenities: 9 flags
# Density dummies: suburban, rural (urban = reference)
# We skip cuisine dummies to keep the model interpretable at feature level.

price_vals = [r["price"] for r in records if r["price"] is not None]
price_mean = sum(price_vals) / len(price_vals) if price_vals else 2.0

FEATURE_NAMES = [
    "stars",
    "log_reviews",
    "log_checkins",
    "price",
    "outdoor_seating",
    "delivery",
    "takeout",
    "reservations",
    "wifi",
    "good_for_groups",
    "good_for_kids",
    "has_tv",
    "bike_parking",
    "caters",
    "density_suburban",
    "density_rural",
]

def make_row(r):
    return [
        r["stars"],
        math.log1p(r["reviews"]),
        math.log1p(r["checkins"]),
        float(r["price"]) if r["price"] else price_mean,
        r["outdoor_seating"],
        r["delivery"],
        r["takeout"],
        r["reservations"],
        r["wifi"],
        r["good_for_groups"],
        r["good_for_kids"],
        r["has_tv"],
        r["bike_parking"],
        r["caters"],
        1.0 if r["density"] == "suburban" else 0.0,
        1.0 if r["density"] == "rural"    else 0.0,
    ]

X = [make_row(r) for r in records]
y = [r["is_open"] for r in records]

print(f"  Feature matrix: {len(X)} × {len(X[0])}")
print(f"  Class balance: {sum(y):,} open ({100*sum(y)/len(y):.1f}%)  "
      f"{len(y)-sum(y):,} closed ({100*(len(y)-sum(y))/len(y):.1f}%)")

# ── Step 5: Standardize features ─────────────────────────────────────────────
n = len(X)
p = len(X[0])
means = [sum(X[i][j] for i in range(n)) / n for j in range(p)]
stds  = [
    math.sqrt(sum((X[i][j] - means[j])**2 for i in range(n)) / n) or 1.0
    for j in range(p)
]
Xs = [[(X[i][j] - means[j]) / stds[j] for j in range(p)] for i in range(n)]

# ── Step 6: Logistic regression (sklearn) ────────────────────────────────────
try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import roc_auc_score, accuracy_score

    X_tr, X_te, y_tr, y_te = train_test_split(
        Xs, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = LogisticRegression(max_iter=1000, random_state=42, class_weight="balanced")
    clf.fit(X_tr, y_tr)

    y_pred = clf.predict(X_te)
    y_prob = clf.predict_proba(X_te)[:, 1]

    acc = accuracy_score(y_te, y_pred)
    auc = roc_auc_score(y_te, y_prob)
    coefs = clf.coef_[0].tolist()

    print(f"\nModel performance:")
    print(f"  Accuracy : {acc:.3f}")
    print(f"  ROC-AUC  : {auc:.3f}")

except ImportError:
    print("scikit-learn not found. Falling back to manual logistic regression (SGD).")
    import random

    # Simple logistic regression with gradient descent
    random.seed(42)
    w = [0.0] * p
    b = 0.0
    lr = 0.05
    EPOCHS = 80

    idx = list(range(n))
    for ep in range(EPOCHS):
        random.shuffle(idx)
        for i in idx:
            xi = Xs[i]
            dot = sum(w[j] * xi[j] for j in range(p)) + b
            dot = max(-30, min(30, dot))
            prob = 1 / (1 + math.exp(-dot))
            err = prob - y[i]
            for j in range(p):
                w[j] -= lr * err * xi[j] / n
            b -= lr * err / n
        if (ep + 1) % 20 == 0:
            loss = 0.0
            for i in range(n):
                dot_i = max(-30, min(30, sum(w[j] * Xs[i][j] for j in range(p)) + b))
                p_i = 1 / (1 + math.exp(-dot_i))
                loss -= y[i] * math.log(max(1e-9, p_i)) + (1 - y[i]) * math.log(max(1e-9, 1 - p_i))
            loss /= n
            print(f"  Epoch {ep+1:>3}: loss={loss:.4f}")

    coefs = w
    correct = sum(
        1 for i in range(n)
        if (1/(1+math.exp(-max(-30,min(30,sum(w[j]*Xs[i][j] for j in range(p))+b)))) >= 0.5) == bool(y[i])
    )
    acc = correct / n
    auc = None
    print(f"  Accuracy (train): {acc:.3f}")

# ── Step 7: Odds ratios + feature table ──────────────────────────────────────
feature_results = []
for j, name in enumerate(FEATURE_NAMES):
    c = coefs[j]
    odds_ratio = math.exp(c)
    feature_results.append({
        "feature":    name,
        "coef":       round(c, 4),
        "odds_ratio": round(odds_ratio, 4),
        "pct_change": round((odds_ratio - 1) * 100, 1),
    })

# Sort by absolute coefficient for display
feature_results.sort(key=lambda x: abs(x["coef"]), reverse=True)

print("\nTop predictors of restaurant survival (standardized coefficients):")
print(f"{'Feature':<22} {'Coef':>8}  {'OR':>8}  {'% Change':>10}")
print("-" * 54)
for fr in feature_results:
    direction = "+" if fr["coef"] > 0 else ""
    print(f"{fr['feature']:<22} {direction}{fr['coef']:>7.3f}  {fr['odds_ratio']:>8.3f}  "
          f"{direction}{fr['pct_change']:>8.1f}%")

# ── Step 8: Descriptive breakdowns ───────────────────────────────────────────
print("\nDescriptive breakdowns:")

# Survival by star bucket
star_buckets = [("1–2★", 0, 2.25), ("2–3★", 2.25, 3.25), ("3–4★", 3.25, 4.25), ("4–5★", 4.25, 5.1)]
survival_by_stars = []
for label, lo, hi in star_buckets:
    subset = [r for r in records if lo <= r["stars"] < hi]
    if subset:
        rate = sum(r["is_open"] for r in subset) / len(subset)
        survival_by_stars.append({"bucket": label, "n": len(subset), "survival_rate": round(rate, 4)})
        print(f"  {label}: {rate:.1%} survival ({len(subset):,} restaurants)")

# Survival by price tier
price_buckets = [(1, "$"), (2, "$$"), (3, "$$$"), (4, "$$$$")]
survival_by_price = []
for tier, label in price_buckets:
    subset = [r for r in records if r["price"] == tier]
    if subset:
        rate = sum(r["is_open"] for r in subset) / len(subset)
        survival_by_price.append({"tier": tier, "label": label, "n": len(subset), "survival_rate": round(rate, 4)})
        print(f"  {label}: {rate:.1%} survival ({len(subset):,} restaurants)")

# Survival by density
survival_by_density = []
for density in ("urban", "suburban", "rural"):
    subset = [r for r in records if r["density"] == density]
    if subset:
        rate = sum(r["is_open"] for r in subset) / len(subset)
        survival_by_density.append({"density": density, "n": len(subset), "survival_rate": round(rate, 4)})
        print(f"  {density}: {rate:.1%} survival ({len(subset):,} restaurants)")

# Survival by amenity (bivariate — not controlled for confounders)
amenity_keys = ["outdoor_seating", "delivery", "takeout", "reservations",
                "wifi", "good_for_groups", "good_for_kids", "has_tv", "bike_parking", "caters"]
amenity_survival = []
print("\nAmenity bivariate survival rates:")
for key in amenity_keys:
    with_am    = [r for r in records if r[key] == 1.0]
    without_am = [r for r in records if r[key] == 0.0]
    if not with_am:
        continue
    rate_with    = sum(r["is_open"] for r in with_am)    / len(with_am)
    rate_without = sum(r["is_open"] for r in without_am) / len(without_am)
    diff = rate_with - rate_without
    amenity_survival.append({
        "amenity": key,
        "with_rate":    round(rate_with, 4),
        "without_rate": round(rate_without, 4),
        "diff":         round(diff, 4),
        "n_with":       len(with_am),
    })
    print(f"  {key:<22}: with={rate_with:.1%}  without={rate_without:.1%}  "
          f"diff={diff:+.1%}  (n={len(with_am):,})")

# Survival by top 10 cuisines
cuisine_survival = []
cuisine_counts = Counter(r["cuisine"] for r in records)
top_cuisines = [c for c, _ in cuisine_counts.most_common(12) if c != "Other"]
for cuisine in top_cuisines:
    subset = [r for r in records if r["cuisine"] == cuisine]
    rate = sum(r["is_open"] for r in subset) / len(subset)
    cuisine_survival.append({
        "cuisine":       cuisine,
        "n":             len(subset),
        "survival_rate": round(rate, 4),
    })
cuisine_survival.sort(key=lambda x: x["survival_rate"], reverse=True)

# Sweet-spot analysis: stars 4–4.5, price $$-$$$ → survival rate
sweet_spot = [r for r in records if 4.0 <= r["stars"] <= 4.5 and r["price"] in (2, 3)]
sweet_spot_rate = sum(r["is_open"] for r in sweet_spot) / len(sweet_spot) if sweet_spot else 0

# Overall closure rate
overall_rate = sum(r["is_open"] for r in records) / len(records)
closure_rate = 1 - overall_rate

# Best single amenity for survival lift (bivariate)
best_amenity = max(amenity_survival, key=lambda x: x["diff"])

# Outdoor seating effect (specific stat for Finale)
outdoor = next((a for a in amenity_survival if a["amenity"] == "outdoor_seating"), None)
outdoor_diff = outdoor["diff"] if outdoor else 0

print(f"\nKey findings:")
print(f"  Sweet spot (4–4.5★, $$–$$$) survival: {sweet_spot_rate:.1%}")
print(f"  Overall closure rate: {closure_rate:.1%}")
print(f"  Best amenity for survival: {best_amenity['amenity']} (+{best_amenity['diff']:.1%})")
if outdoor:
    print(f"  Outdoor seating survival lift: {outdoor_diff:+.1%}")

# ── Step 9: Write output ──────────────────────────────────────────────────────
output = {
    "meta": {
        "n_total":      len(records),
        "n_open":       sum(r["is_open"] for r in records),
        "n_closed":     len(records) - sum(r["is_open"] for r in records),
        "open_rate":    round(overall_rate, 4),
        "closure_rate": round(closure_rate, 4),
        "model_accuracy": round(acc, 4),
        "model_auc":    round(auc, 4) if auc else None,
        "states":       sorted(FOCUS_STATES),
        "price_mean_fill": round(price_mean, 2),
    },
    "feature_importance": feature_results,
    "survival_by_stars":   survival_by_stars,
    "survival_by_price":   survival_by_price,
    "survival_by_density": survival_by_density,
    "amenity_survival":    sorted(amenity_survival, key=lambda x: x["diff"], reverse=True),
    "cuisine_survival":    cuisine_survival,
    "key_findings": {
        "sweet_spot_survival": round(sweet_spot_rate, 4),
        "sweet_spot_n":        len(sweet_spot),
        "closure_rate":        round(closure_rate, 4),
        "best_amenity":        best_amenity["amenity"],
        "best_amenity_lift":   best_amenity["diff"],
        "outdoor_seating_lift": round(outdoor_diff, 4) if outdoor else None,
    },
}

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2)

print(f"\nWrote {OUT_PATH}")
print("Done.")
