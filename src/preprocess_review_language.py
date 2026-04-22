"""
Yelp Review Language Explorer — Data Preprocessor
===================================================
Reads review.json + business.json, filters to PA/NJ restaurants,
computes distinctive terms per star bucket using log-likelihood ratio,
and outputs review_language.json for the React component.

Usage:
    python preprocess_review_language.py

Expects in current directory:
    - yelp_academic_dataset_business.json
    - yelp_academic_dataset_review.json

Outputs:
    - review_language.json
"""

import json
import math
import re
import os
from collections import Counter, defaultdict

BUSINESS_FILE = "yelp_academic_dataset_business.json"
REVIEW_FILE = "yelp_academic_dataset_review.json"
OUTPUT_FILE = "review_language.json"

STATES = {"PA", "NJ"}

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

STAR_BUCKETS = {
    "1-2": [1.0, 1.5, 2.0],
    "3": [2.5, 3.0],
    "4": [3.5, 4.0],
    "4.5-5": [4.5, 5.0],
}

# Common English stop words + food-generic terms to exclude
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "dare",
    "that", "this", "these", "those", "i", "me", "my", "we", "our", "you",
    "your", "he", "she", "his", "her", "they", "them", "their", "its",
    "what", "which", "who", "whom", "where", "when", "why", "how",
    "not", "no", "nor", "so", "if", "then", "than", "too", "very",
    "just", "about", "also", "more", "some", "any", "all", "each",
    "every", "both", "few", "most", "other", "into", "out", "up",
    "down", "over", "under", "again", "once", "here", "there",
    "am", "are", "as", "because", "before", "after", "above", "below",
    "between", "through", "during", "while", "own", "same", "such",
    "only", "really", "much", "even", "still", "back", "get", "got",
    "go", "went", "come", "came", "make", "made", "take", "took",
    "like", "one", "two", "first", "time", "way", "thing", "well",
    "us", "said", "say", "new", "now", "old", "see", "know", "think",
    "good", "great", "nice", "bad", "best", "food", "place", "restaurant",
    "order", "ordered", "definitely", "always", "never", "ever", "going",
    "try", "tried", "ive", "dont", "didnt", "wasnt", "wont", "cant",
    "im", "thats", "its", "youre", "theyre", "weve", "theyd", "ill",
    "bit", "lot", "many", "enough", "something", "anything", "nothing",
    "everything", "someone", "anyone", "everyone", "around", "right",
    "left", "last", "next", "long", "little", "big", "sure", "put",
    "give", "gave", "let", "keep", "kept", "though", "since", "yet",
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


def standardize_city(city):
    if not isinstance(city, str):
        return "Unknown"
    city = city.strip().title()
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
    }
    return fixes.get(city, city)


def get_star_bucket(stars):
    for bucket, values in STAR_BUCKETS.items():
        if stars in values:
            return bucket
    return None


def tokenize(text):
    """Simple tokenizer: lowercase, split on non-alpha, filter short/stop words."""
    words = re.findall(r"[a-z]{3,}", text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) <= 20]


def log_likelihood_ratio(word_in_bucket, total_in_bucket, word_in_rest, total_in_rest):
    """Compute log-likelihood ratio for a word in one bucket vs the rest."""
    a = word_in_bucket
    b = word_in_rest
    c = total_in_bucket
    d = total_in_rest
    if a == 0 or b == 0 or c == 0 or d == 0:
        return 0
    e1 = c * (a + b) / (c + d)
    e2 = d * (a + b) / (c + d)
    if e1 == 0 or e2 == 0:
        return 0
    ll = 2 * (a * math.log(a / e1) + b * math.log(b / e2))
    # Sign: positive if overrepresented in bucket
    if a / c > b / d:
        return ll
    return -ll


# ── STEP 1: Build business lookup ───────────────────────────────────────
print("Step 1: Loading PA/NJ restaurant metadata...")
biz_lookup = {}  # business_id -> {city, cuisine, state}
with open(BUSINESS_FILE, "r", encoding="utf-8") as f:
    for line in f:
        row = json.loads(line)
        if row.get("state") not in STATES:
            continue
        if not is_food_business(row.get("categories")):
            continue
        biz_lookup[row["business_id"]] = {
            "city": standardize_city(row["city"]),
            "cuisine": get_cuisine(row.get("categories")),
        }
print(f"  Found {len(biz_lookup):,} PA/NJ restaurants")


# ── STEP 2: Process reviews ─────────────────────────────────────────────
print("Step 2: Processing reviews (this may take a few minutes)...")

# We'll compute term frequencies per combination of:
# star_bucket x cuisine x city (for filtering)
# But storing all combinations would be huge, so we store:
# 1. Global: term freqs per star bucket (for the default view)
# 2. Per-cuisine: term freqs per star bucket x cuisine
# 3. Per-city: term freqs per star bucket x city

# For efficiency, we'll compute global + per-cuisine + per-city separately
global_counts = defaultdict(Counter)  # bucket -> Counter of words
global_totals = defaultdict(int)       # bucket -> total word count
cuisine_counts = defaultdict(lambda: defaultdict(Counter))  # cuisine -> bucket -> Counter
cuisine_totals = defaultdict(lambda: defaultdict(int))
city_counts = defaultdict(lambda: defaultdict(Counter))
city_totals = defaultdict(lambda: defaultdict(int))

review_count = 0
kept_count = 0

with open(REVIEW_FILE, "r", encoding="utf-8") as f:
    for line in f:
        review_count += 1
        if review_count % 500000 == 0:
            print(f"  Processed {review_count:,} reviews, kept {kept_count:,}...")

        row = json.loads(line)
        bid = row.get("business_id")
        if bid not in biz_lookup:
            continue

        stars = row.get("stars")
        bucket = get_star_bucket(stars)
        if bucket is None:
            continue

        kept_count += 1
        biz = biz_lookup[bid]
        cuisine = biz["cuisine"]
        city = biz["city"]

        tokens = tokenize(row.get("text", ""))

        for word in tokens:
            global_counts[bucket][word] += 1
            cuisine_counts[cuisine][bucket][word] += 1
            city_counts[city][bucket][word] += 1

        global_totals[bucket] += len(tokens)
        cuisine_totals[cuisine][bucket] += len(tokens)
        city_totals[city][bucket] += len(tokens)

print(f"  Done: {review_count:,} total reviews, {kept_count:,} kept (PA/NJ restaurants)")
for b in ["1-2", "3", "4", "4.5-5"]:
    print(f"    Bucket {b}: {global_totals[b]:,} words")


# ── STEP 3: Compute distinctive terms ──────────────────────────────────
print("Step 3: Computing distinctive terms per bucket...")

TOP_N = 40  # top terms per bucket


def compute_distinctive_terms(counts_dict, totals_dict):
    """Given {bucket: Counter} and {bucket: total}, return {bucket: [{word, score, freq, pct}]}"""
    all_buckets = list(STAR_BUCKETS.keys())
    result = {}

    for bucket in all_buckets:
        bucket_counter = counts_dict.get(bucket, Counter())
        bucket_total = totals_dict.get(bucket, 0)
        if bucket_total == 0:
            result[bucket] = []
            continue

        # Sum up "rest" = all other buckets combined
        rest_counter = Counter()
        rest_total = 0
        for other in all_buckets:
            if other != bucket:
                rest_counter += counts_dict.get(other, Counter())
                rest_total += totals_dict.get(other, 0)

        # Score each word
        scored = []
        for word, count in bucket_counter.items():
            if count < 10:  # minimum frequency threshold
                continue
            rest_count = rest_counter.get(word, 0)
            ll = log_likelihood_ratio(count, bucket_total, rest_count, rest_total)
            if ll > 0:  # only overrepresented words
                pct = count / bucket_total * 100
                scored.append({
                    "word": word,
                    "score": round(ll, 1),
                    "count": count,
                    "pct": round(pct, 4),
                })

        scored.sort(key=lambda x: x["score"], reverse=True)
        result[bucket] = scored[:TOP_N]

    return result


# Global distinctive terms
global_terms = compute_distinctive_terms(global_counts, global_totals)

# Per-cuisine
cuisine_terms = {}
for cuisine in cuisine_counts:
    terms = compute_distinctive_terms(cuisine_counts[cuisine], cuisine_totals[cuisine])
    # Only include if there's meaningful data
    has_data = any(len(v) >= 5 for v in terms.values())
    if has_data:
        cuisine_terms[cuisine] = terms

# Per-city (top 30 cities by review volume only)
city_review_volumes = {
    city: sum(city_totals[city].values()) for city in city_totals
}
top_cities = sorted(city_review_volumes, key=city_review_volumes.get, reverse=True)[:30]

city_terms = {}
for city in top_cities:
    terms = compute_distinctive_terms(city_counts[city], city_totals[city])
    has_data = any(len(v) >= 5 for v in terms.values())
    if has_data:
        city_terms[city] = terms


# ── STEP 4: Build output ───────────────────────────────────────────────
print("Step 4: Building output JSON...")

output = {
    "meta": {
        "total_reviews": kept_count,
        "buckets": {
            b: {"word_count": global_totals[b]} for b in STAR_BUCKETS
        },
        "cuisines": sorted(cuisine_terms.keys()),
        "cities": sorted(city_terms.keys()),
    },
    "global": global_terms,
    "by_cuisine": cuisine_terms,
    "by_city": city_terms,
}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, separators=(",", ":"))

size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
print(f"\nDone! Wrote {OUTPUT_FILE} ({size_mb:.1f} MB)")
print(f"  {len(cuisine_terms)} cuisines, {len(city_terms)} cities")
print(f"  {TOP_N} terms per bucket per slice")
print("\nDrop review_language.json into your React app's public/ folder.")
