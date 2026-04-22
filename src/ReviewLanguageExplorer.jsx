import React, { useState, useEffect, useMemo } from "react";

const YELP_RED = "#d32323";
const WARM_GRAY = "#5a5a52";
const LIGHT_BG = "#faf8f4";
const PANEL_BG = "#f2efea";

const BUCKET_ORDER = ["1-2", "3", "4", "4.5-5"];

const BUCKET_LABELS = {
  "1-2": "1–2★",
  "3": "3★",
  "4": "4★",
  "4.5-5": "4.5–5★",
};

const BUCKET_COLORS = {
  "1-2": "#c1272d",
  "3": "#ef8b2c",
  "4": "#7cb342",
  "4.5-5": "#2da44e",
};

const BUCKET_COLORS_LIGHT = {
  "1-2": "#fce4e4",
  "3": "#fef3e2",
  "4": "#edf5e0",
  "4.5-5": "#e0f2e9",
};

export default function ReviewLanguageExplorer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Left panel state
  const [leftBucket, setLeftBucket] = useState("1-2");
  // Right panel state
  const [rightBucket, setRightBucket] = useState("4.5-5");
  // Shared filters
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [topN, setTopN] = useState(20);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}review_language.json`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load review_language.json:", err);
        setLoading(false);
      });
  }, []);

  // Get terms for a given bucket based on current filters
  const getTerms = (bucket) => {
    if (!data) return [];
    let source = data.global;
    if (selectedCuisine !== "All" && data.by_cuisine[selectedCuisine]) {
      source = data.by_cuisine[selectedCuisine];
    }
    if (selectedCity !== "All" && data.by_city[selectedCity]) {
      source = data.by_city[selectedCity];
    }
    return (source[bucket] || []).slice(0, topN);
  };

  const leftTerms = useMemo(() => getTerms(leftBucket), [data, leftBucket, selectedCuisine, selectedCity, topN]);
  const rightTerms = useMemo(() => getTerms(rightBucket), [data, rightBucket, selectedCuisine, selectedCity, topN]);

  // Max score across both panels for consistent bar scaling
  const maxScore = useMemo(() => {
    const allScores = [...leftTerms, ...rightTerms].map((t) => t.score);
    return Math.max(...allScores, 1);
  }, [leftTerms, rightTerms]);

  const clearFilters = () => {
    setSelectedCuisine("All");
    setSelectedCity("All");
    setLeftBucket("1-2");
    setRightBucket("4.5-5");
    setTopN(20);
  };

  // Render a single bar chart panel
  const renderPanel = (terms, bucket, setBucket, side) => {
    const color = BUCKET_COLORS[bucket];
    const lightColor = BUCKET_COLORS_LIGHT[bucket];

    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Bucket selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {BUCKET_ORDER.map((key) => (
            <button
              key={key}
              onClick={() => setBucket(key)}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "1.5px solid",
                borderColor: bucket === key ? BUCKET_COLORS[key] : "#d9d5cc",
                background: bucket === key ? BUCKET_COLORS[key] : "white",
                color: bucket === key ? "white" : "#888",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {BUCKET_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Header */}
        <div
          style={{
            background: lightColor,
            borderLeft: `4px solid ${color}`,
            borderRadius: "0 8px 8px 0",
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color }}>
            Most distinctive words in {BUCKET_LABELS[bucket]} reviews
          </div>
          <div style={{ fontSize: 11, color: WARM_GRAY, marginTop: 2 }}>
            Ranked by log-likelihood ratio vs. all other ratings
          </div>
        </div>

        {/* Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {terms.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>
              Not enough data for this filter combination
            </div>
          ) : (
            terms.map((term, i) => {
              const barWidth = (term.score / maxScore) * 100;
              return (
                <div
                  key={term.word}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      fontSize: 11,
                      color: "#bbb",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      width: 90,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1a1a1a",
                      textAlign: "right",
                      flexShrink: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {term.word}
                  </div>
                  <div style={{ flex: 1, height: 22, background: "#f5f3ef", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: "100%",
                        background: color,
                        borderRadius: 4,
                        opacity: 0.75,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div style={{ width: 50, fontSize: 11, color: "#999", flexShrink: 0 }}>
                    {term.count.toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: LIGHT_BG, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e4e0d8", padding: "20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: YELP_RED, fontSize: 22, fontWeight: 700 }}>★ yelp</div>
          <div style={{ color: "#999", fontSize: 13 }}>Academic Dataset</div>
        </div>
        <h1 style={{ fontSize: 24, marginTop: 16, fontFamily: "'DM Serif Display', serif", color: "#1a1a1a" }}>
          Review Language Explorer
        </h1>
        <div style={{ fontSize: 13, color: WARM_GRAY, marginTop: 4 }}>
          What words distinguish reviews at each star level?
          {data && (
            <span>
              {" "}
              · {data.meta.total_reviews.toLocaleString()} reviews from PA & NJ restaurants
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, padding: 32 }}>
        {/* Filter sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
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

          {/* Cuisine */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
              Cuisine
            </div>
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d9d5cc",
                borderRadius: 6,
                fontSize: 13,
                background: "white",
              }}
            >
              <option value="All">All cuisines</option>
              {data &&
                data.meta.cuisines.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
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
              <option value="All">All cities</option>
              {data &&
                data.meta.cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          {/* Top N slider */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
              Terms shown: {topN}
            </div>
            <input
              type="range"
              min={10}
              max={40}
              step={5}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              style={{ width: "100%", accentColor: YELP_RED }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#bbb" }}>
              <span>10</span>
              <span>40</span>
            </div>
          </div>

          {/* How to read */}
          <div
            style={{
              background: PANEL_BG,
              borderRadius: 8,
              padding: 14,
              fontSize: 12,
              color: WARM_GRAY,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: "#1a1a1a" }}>How to read this</div>
            Longer bars = more distinctive to that star level compared to all other ratings. These aren't the most
            frequent words — they're the ones that{" "}
            <strong>disproportionately appear</strong> in reviews at that rating.
          </div>

          {/* Insights callout */}
          <div
            style={{
              background: "#fef3e2",
              borderLeft: "4px solid #e8a020",
              borderRadius: "0 8px 8px 0",
              padding: 14,
              marginTop: 16,
              fontSize: 12,
              color: "#7a6a40",
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: "#c47a00" }}>Try this</div>
            Compare 1–2★ vs 4.5–5★ — notice how negative reviews focus on{" "}
            <em>service failures</em> while top reviews highlight <em>specific dishes</em> and <em>atmosphere</em>.
          </div>
        </div>

        {/* Main content: side-by-side panels */}
        <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 24, border: "1px solid #e4e0d8" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "#999" }}>Loading review_language.json...</div>
          ) : !data ? (
            <div style={{ padding: 60, textAlign: "center", color: "#999" }}>
              No data loaded. Make sure review_language.json is in your public folder.
            </div>
          ) : (
            <>
              {/* Comparison header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: BUCKET_COLORS_LIGHT[leftBucket],
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    color: BUCKET_COLORS[leftBucket],
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: BUCKET_COLORS[leftBucket] }} />
                  {BUCKET_LABELS[leftBucket]} reviews
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ccc" }}>vs</div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: BUCKET_COLORS_LIGHT[rightBucket],
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    color: BUCKET_COLORS[rightBucket],
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: BUCKET_COLORS[rightBucket] }} />
                  {BUCKET_LABELS[rightBucket]} reviews
                </div>
              </div>

              {/* Side-by-side panels */}
              <div style={{ display: "flex", gap: 32 }}>
                {renderPanel(leftTerms, leftBucket, setLeftBucket, "left")}
                <div style={{ width: 1, background: "#e4e0d8", flexShrink: 0 }} />
                {renderPanel(rightTerms, rightBucket, setRightBucket, "right")}
              </div>

              {/* Shared words callout */}
              {leftTerms.length > 0 && rightTerms.length > 0 && (() => {
                const leftWords = new Set(leftTerms.map((t) => t.word));
                const rightWords = new Set(rightTerms.map((t) => t.word));
                const shared = [...leftWords].filter((w) => rightWords.has(w));
                const onlyLeft = leftTerms.filter((t) => !rightWords.has(t.word)).slice(0, 3);
                const onlyRight = rightTerms.filter((t) => !leftWords.has(t.word)).slice(0, 3);

                return (
                  <div
                    style={{
                      marginTop: 24,
                      padding: 16,
                      background: PANEL_BG,
                      borderRadius: 8,
                      fontSize: 13,
                      color: WARM_GRAY,
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ color: "#1a1a1a" }}>Quick insight: </strong>
                    {shared.length > 0 ? (
                      <>
                        {shared.length} word{shared.length !== 1 ? "s" : ""} appear in both lists
                        {shared.length <= 5 && <> ({shared.join(", ")})</>}.{" "}
                      </>
                    ) : (
                      <>No words overlap between the two lists. </>
                    )}
                    {onlyLeft.length > 0 && (
                      <>
                        Unique to{" "}
                        <span style={{ color: BUCKET_COLORS[leftBucket], fontWeight: 600 }}>
                          {BUCKET_LABELS[leftBucket]}
                        </span>
                        : {onlyLeft.map((t) => t.word).join(", ")}.{" "}
                      </>
                    )}
                    {onlyRight.length > 0 && (
                      <>
                        Unique to{" "}
                        <span style={{ color: BUCKET_COLORS[rightBucket], fontWeight: 600 }}>
                          {BUCKET_LABELS[rightBucket]}
                        </span>
                        : {onlyRight.map((t) => t.word).join(", ")}.
                      </>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "20px 40px", fontSize: 11, color: "#888", textAlign: "center" }}>
        Data: Yelp Open Dataset (yelp.com/dataset) · PA & NJ restaurants · Distinctiveness measured by log-likelihood
        ratio
      </div>
    </div>
  );
}
