import React, { useState, useEffect, useMemo } from "react";

// SweetSpotScatter — interactive scatter plot of Yelp restaurants
// X axis: star rating (jittered)
// Y axis: check-in count (log scale)
// Filters: cuisine, price tier, city
// Default-visible annotation on the 5.0 cluster
//
// Usage:
//   1. Place restaurants.json (from preprocess_for_scatter.py) next to this file
//   2. Import and render <SweetSpotScatter />

const YELP_RED = "#d32323";
const WARM_GRAY = "#5a5a52";
const LIGHT_BG = "#faf8f4";
const PANEL_BG = "#f2efea";

const PRICE_LABELS = { 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

// Color ramp for star ratings (matches the screenshot legend)
const ratingColor = (stars) => {
  if (stars >= 4.5) return "#2da44e";
  if (stars >= 4.0) return "#7cb342";
  if (stars >= 3.5) return "#e8b030";
  if (stars >= 3.0) return "#ef8b2c";
  if (stars >= 2.0) return "#e85d3c";
  return "#c1272d";
};

export default function SweetSpotScatter() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCuisines, setSelectedCuisines] = useState(new Set());
  const [selectedPrices, setSelectedPrices] = useState(new Set([1, 2, 3, 4]));
  const [selectedCity, setSelectedCity] = useState("All cities");
  const [hoverPoint, setHoverPoint] = useState(null);

  // Load data
  useEffect(() => {
    fetch("/restaurants.json")
      .then((r) => r.json())
      .then((rows) => {
        setData(rows);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load restaurants.json:", err);
        setLoading(false);
      });
  }, []);

  // Derive filter options from data (Pennsylvania only)
  const paData = useMemo(() => data.filter((r) => r.state === "PA" || r.state === "NJ"), [data]);

  const { cuisines, cities } = useMemo(() => {
    const cuisineMap = {};
    const cityMap = {};
    for (const r of paData) {
      cuisineMap[r.cuisine] = (cuisineMap[r.cuisine] || 0) + 1;
      cityMap[r.city] = (cityMap[r.city] || 0) + 1;
    }
    return {
      cuisines: Object.entries(cuisineMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      cities: ["All cities", ...Object.entries(cityMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name]) => name)],
    };
  }, [paData]);

  // Apply filters
  const filtered = useMemo(() => {
    return paData.filter((r) => {
      if (selectedCuisines.size > 0 && !selectedCuisines.has(r.cuisine)) return false;
      if (!selectedPrices.has(r.price)) return false;
      if (selectedCity !== "All cities" && r.city !== selectedCity) return false;
      return true;
    });
  }, [paData, selectedCuisines, selectedPrices, selectedCity]);

  // Compute stats for the 5.0 annotation
  const fiveStarStats = useMemo(() => {
    const five = filtered.filter((r) => r.stars === 5.0);
    if (five.length === 0) return null;
    const avgReviews = Math.round(five.reduce((s, r) => s + r.reviews, 0) / five.length);
    const avgCheckins = Math.round(five.reduce((s, r) => s + r.checkins, 0) / five.length);
    return { count: five.length, avgReviews, avgCheckins };
  }, [filtered]);

  // Compute stats for the 4.0 sweet spot annotation
  const fourStarStats = useMemo(() => {
    const four = filtered.filter((r) => r.stars === 4.0);
    if (four.length === 0) return null;
    const avgReviews = Math.round(four.reduce((s, r) => s + r.reviews, 0) / four.length);
    const avgCheckins = Math.round(four.reduce((s, r) => s + r.checkins, 0) / four.length);
    return { count: four.length, avgReviews, avgCheckins };
  }, [filtered]);

  // Chart dimensions
  const W = 900;
  const H = 600;
  const PAD = { top: 130, right: 60, bottom: 60, left: 80 };

  // Scales
  const xValues = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const xScale = (stars) => {
    const i = xValues.indexOf(stars);
    if (i < 0) return PAD.left;
    return PAD.left + (i / (xValues.length - 1)) * (W - PAD.left - PAD.right);
  };

  // Log scale for Y (check-ins)
  const yMax = 2000;
  const yMin = 1;
  const yScale = (v) => {
    const clamped = Math.max(yMin, Math.min(yMax, v || yMin));
    const logV = Math.log10(clamped);
    const logMax = Math.log10(yMax);
    const logMin = Math.log10(yMin);
    return H - PAD.bottom - ((logV - logMin) / (logMax - logMin)) * (H - PAD.top - PAD.bottom);
  };

  // Jitter X to spread overlapping points
  const jitter = (id) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return ((h % 1000) / 1000 - 0.5) * 30;
  };

  const yTicks = [1, 10, 100, 1000];

  // Toggle helpers
  const toggleCuisine = (name) => {
    const next = new Set(selectedCuisines);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedCuisines(next);
  };
  const togglePrice = (p) => {
    const next = new Set(selectedPrices);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelectedPrices(next);
  };
  const clearFilters = () => {
    setSelectedCuisines(new Set());
    setSelectedPrices(new Set([1, 2, 3, 4]));
    setSelectedCity("All cities");
  };

  // Sample for performance — show max 5000 points
  const displayPoints = useMemo(() => {
    if (filtered.length <= 5000) return filtered;
    const step = filtered.length / 5000;
    const out = [];
    for (let i = 0; i < filtered.length; i += step) {
      out.push(filtered[Math.floor(i)]);
    }
    return out;
  }, [filtered]);

  return (
    <div style={{ background: LIGHT_BG, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e4e0d8", padding: "20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: YELP_RED, fontSize: 22, fontWeight: 700 }}>★ yelp</div>
          <div style={{ color: "#999", fontSize: 13 }}>Academic Dataset</div>
        </div>
        <h1 style={{ fontSize: 24, marginTop: 16, fontFamily: "'DM Serif Display', serif", color: "#1a1a1a" }}>
          The Sweet Spot
        </h1>
        <div style={{ fontSize: 13, color: WARM_GRAY, marginTop: 4 }}>
          Star rating vs. check-ins · {filtered.length.toLocaleString()} restaurants
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, padding: 32 }}>
        {/* Filter sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", textTransform: "uppercase" }}>
              Filters
            </div>
            <button
              onClick={clearFilters}
              style={{
                fontSize: 11,
                color: YELP_RED,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reset
            </button>
          </div>

          <div style={{ background: PANEL_BG, borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: YELP_RED }}>
              {filtered.length.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "#888" }}>of {paData.length.toLocaleString()} PA restaurants</div>
          </div>

          {/* City */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
              City
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d9d5cc",
                borderRadius: 6,
                fontSize: 13,
                background: "white",
              }}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Price tier */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
              Price tier
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  onClick={() => togglePrice(p)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "1px solid",
                    borderColor: selectedPrices.has(p) ? YELP_RED : "#d9d5cc",
                    background: selectedPrices.has(p) ? YELP_RED : "white",
                    color: selectedPrices.has(p) ? "white" : "#888",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {PRICE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
              Cuisine
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
              {cuisines.map(({ name, count }) => (
                <label
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 0",
                    fontSize: 13,
                    cursor: "pointer",
                    color: "#1a1a1a",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCuisines.has(name)}
                    onChange={() => toggleCuisine(name)}
                    style={{ marginRight: 8, accentColor: YELP_RED }}
                  />
                  <span style={{ flex: 1 }}>{name}</span>
                  <span style={{ color: "#bbb", fontSize: 11 }}>{count.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 24, border: "1px solid #e4e0d8" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "#999" }}>Loading restaurants.json...</div>
          ) : data.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#999" }}>
              No data loaded. Make sure restaurants.json is in your public folder.
            </div>
          ) : (
            <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
              {/* Y grid lines */}
              {yTicks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={yScale(t)}
                    y2={yScale(t)}
                    stroke="#eee"
                    strokeDasharray="2,3"
                  />
                  <text x={PAD.left - 10} y={yScale(t) + 4} textAnchor="end" fontSize="11" fill="#999">
                    {t.toLocaleString()}
                  </text>
                </g>
              ))}

              {/* X axis labels */}
              {xValues.map((v) => (
                <text
                  key={v}
                  x={xScale(v)}
                  y={H - PAD.bottom + 22}
                  textAnchor="middle"
                  fontSize="12"
                  fill={v === 4.0 ? YELP_RED : "#888"}
                  fontWeight={v === 4.0 ? 700 : 400}
                >
                  {v.toFixed(1)}★
                </text>
              ))}

              {/* Axis titles */}
              <text x={W / 2} y={H - 12} textAnchor="middle" fontSize="12" fill={WARM_GRAY}>
                Star rating
              </text>
              <text x={20} y={H / 2} textAnchor="middle" fontSize="12" fill={WARM_GRAY}
                transform={`rotate(-90, 20, ${H / 2})`}>
                Check-ins (log scale)
              </text>

              {/* Vertical highlight band on 4.0 */}
              <rect
                x={xScale(4.0) - 22}
                y={PAD.top}
                width={44}
                height={H - PAD.top - PAD.bottom}
                fill={YELP_RED}
                opacity="0.05"
              />

              {/* Data points */}
              {displayPoints.map((r) => (
                <circle
                  key={r.id}
                  cx={xScale(r.stars) + jitter(r.id)}
                  cy={yScale(r.checkins)}
                  r={2.5}
                  fill={ratingColor(r.stars)}
                  opacity="0.45"
                  onMouseEnter={() => setHoverPoint(r)}
                  onMouseLeave={() => setHoverPoint(null)}
                  style={{ cursor: "pointer" }}
                />
              ))}

              {/* Annotation: 4.0 sweet spot (above chart, points down to 4.0 column) */}
              {fourStarStats && (
                <g>
                  <rect
                    x={xScale(4.0) - 180}
                    y={20}
                    width={170}
                    height={70}
                    fill={YELP_RED}
                    rx={6}
                  />
                  <text x={xScale(4.0) - 170} y={42} fontSize="13" fontWeight="700" fill="white">
                    The sweet spot
                  </text>
                  <text x={xScale(4.0) - 170} y={60} fontSize="11" fill="white" opacity="0.9">
                    4.0★ · {fourStarStats.avgCheckins} avg check-ins
                  </text>
                  <text x={xScale(4.0) - 170} y={76} fontSize="11" fill="white" opacity="0.9">
                    {fourStarStats.avgReviews} avg reviews
                  </text>
                  <line
                    x1={xScale(4.0) - 95}
                    y1={90}
                    x2={xScale(4.0)}
                    y2={PAD.top - 5}
                    stroke={YELP_RED}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                </g>
              )}

              {/* Annotation: 5.0 perfection trap (above chart, points down to 5.0 column) */}
              {fiveStarStats && (
                <g>
                  <rect
                    x={xScale(5.0) - 170}
                    y={20}
                    width={170}
                    height={70}
                    fill="white"
                    stroke={YELP_RED}
                    strokeWidth="1.5"
                    rx={6}
                  />
                  <text x={xScale(5.0) - 160} y={42} fontSize="13" fontWeight="700" fill={YELP_RED}>
                    The perfection trap
                  </text>
                  <text x={xScale(5.0) - 160} y={60} fontSize="11" fill={WARM_GRAY}>
                    5.0★ · {fiveStarStats.avgCheckins} avg check-ins
                  </text>
                  <text x={xScale(5.0) - 160} y={76} fontSize="11" fill={WARM_GRAY}>
                    only {fiveStarStats.avgReviews} avg reviews
                  </text>
                  <line
                    x1={xScale(5.0) - 85}
                    y1={90}
                    x2={xScale(5.0)}
                    y2={PAD.top - 5}
                    stroke={YELP_RED}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                </g>
              )}

              {/* Hover tooltip */}
              {hoverPoint && (() => {
                const px = xScale(hoverPoint.stars);
                const py = yScale(hoverPoint.checkins);
                const tooltipW = 200;
                const flipLeft = px + tooltipW + 16 > W - PAD.right;
                const tx = flipLeft ? px - tooltipW - 8 : px + 8;
                return (
                  <g>
                    <rect
                      x={tx}
                      y={py - 36}
                      width={tooltipW}
                      height={50}
                      fill="#1a1a1a"
                      rx={4}
                    />
                    <text x={tx + 8} y={py - 20} fontSize="11" fill="white" fontWeight="700">
                      {hoverPoint.name.length > 26 ? hoverPoint.name.slice(0, 26) + "…" : hoverPoint.name}
                    </text>
                    <text x={tx + 8} y={py - 6} fontSize="10" fill="#bbb">
                      {hoverPoint.stars}★ · {hoverPoint.checkins} check-ins · {hoverPoint.reviews} reviews
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}

          {/* Legend below chart */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, fontSize: 11, color: WARM_GRAY }}>
            <span>Dot color = rating:</span>
            {[
              { label: "<2★", color: "#c1272d" },
              { label: "2-3★", color: "#e85d3c" },
              { label: "3★", color: "#ef8b2c" },
              { label: "3.5★", color: "#e8b030" },
              { label: "4★", color: "#7cb342" },
              { label: "4.5★+", color: "#2da44e" },
            ].map((l) => (
              <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }}></span>
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "20px 40px", fontSize: 11, color: "#888", textAlign: "center" }}>
        Data: Yelp Open Dataset (yelp.com/dataset) · Filtered to restaurants and food businesses with price data
      </div>
    </div>
  );
}
