import React, { useState, useEffect, useMemo, useRef } from "react";

const BUCKET_ORDER = ["1-2", "3", "4", "4.5-5"];

const BUCKET_LABELS = {
  "1-2":   "1–2 ★",
  "3":     "3 ★",
  "4":     "4 ★",
  "4.5-5": "4.5–5 ★",
};

const BUCKET_COLORS = {
  "1-2":   "#ef4444",
  "3":     "#f59e0b",
  "4":     "#22c55e",
  "4.5-5": "#16a34a",
};

const BUCKET_BG = {
  "1-2":   "#fef2f2",
  "3":     "#fffbeb",
  "4":     "#f0fdf4",
  "4.5-5": "#dcfce7",
};

function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function BucketTabs({ active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {BUCKET_ORDER.map((key) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              flex: 1,
              padding: "7px 0",
              border: `0.5px solid ${isActive ? BUCKET_COLORS[key] : "#D3D1C7"}`,
              background: isActive ? BUCKET_COLORS[key] : "#ffffff",
              color: isActive ? "#ffffff" : "#888780",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.18s",
              fontFamily: "inherit",
            }}
          >
            {BUCKET_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}

function BarPanel({ terms, bucket, setBucket, maxScore, side }) {
  const color = BUCKET_COLORS[bucket];
  const bg    = BUCKET_BG[bucket];

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
      <BucketTabs active={bucket} onChange={setBucket} />

      {/* Panel header */}
      <div style={{
        padding: "12px 14px",
        background: bg,
        border: `0.5px solid ${color}33`,
        borderLeft: `3px solid ${color}`,
        borderRadius: "0 8px 8px 0",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 2 }}>
          Most distinctive words — {BUCKET_LABELS[bucket]} reviews
        </div>
        <div style={{ fontSize: 11, color: "#888780" }}>
          Bar length = how disproportionately this word appears at this rating vs. all others
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {terms.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#B4B2A9", fontSize: 13 }}>
            Not enough data for this filter combination
          </div>
        ) : terms.map((term, i) => {
          const pct = (term.score / maxScore) * 100;
          return (
            <div key={term.word} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, fontSize: 10, color: "#B4B2A9", textAlign: "right", flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ width: 88, fontSize: 13, fontWeight: 600, color: "#2C2C2A", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {term.word}
              </div>
              <div style={{ flex: 1, height: 20, background: "#F5F5F3", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: color, borderRadius: 4, opacity: 0.75,
                  transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReviewLanguageExplorer() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const [leftBucket,  setLeftBucket]  = useState("1-2");
  const [rightBucket, setRightBucket] = useState("4.5-5");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [selectedCity,    setSelectedCity]    = useState("All");
  const [topN, setTopN] = useState(20);

  const [headerRef, headerInView] = useInView(0.1);
  const [bodyRef,   bodyInView]   = useInView(0.05);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}review_language.json`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getTerms = (bucket) => {
    if (!data) return [];
    let source = data.global;
    if (selectedCuisine !== "All" && data.by_cuisine?.[selectedCuisine]) source = data.by_cuisine[selectedCuisine];
    if (selectedCity    !== "All" && data.by_city?.[selectedCity])        source = data.by_city[selectedCity];
    return (source[bucket] || []).slice(0, topN);
  };

  const leftTerms  = useMemo(() => getTerms(leftBucket),  [data, leftBucket,  selectedCuisine, selectedCity, topN]);
  const rightTerms = useMemo(() => getTerms(rightBucket), [data, rightBucket, selectedCuisine, selectedCity, topN]);

  const maxScore = useMemo(() => {
    return Math.max(...[...leftTerms, ...rightTerms].map((t) => t.score), 1);
  }, [leftTerms, rightTerms]);

  const sharedInsight = useMemo(() => {
    if (!leftTerms.length || !rightTerms.length) return null;
    const lSet = new Set(leftTerms.map((t) => t.word));
    const rSet = new Set(rightTerms.map((t) => t.word));
    const shared   = [...lSet].filter((w) => rSet.has(w));
    const onlyLeft  = leftTerms.filter((t) => !rSet.has(t.word)).slice(0, 3).map((t) => t.word);
    const onlyRight = rightTerms.filter((t) => !lSet.has(t.word)).slice(0, 3).map((t) => t.word);
    return { shared, onlyLeft, onlyRight };
  }, [leftTerms, rightTerms]);

  const reveal = (delay = 0) => ({
    opacity:   headerInView ? 1 : 0,
    transform: headerInView ? "none" : "translateY(20px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  const bodyReveal = (delay = 0) => ({
    opacity:   bodyInView ? 1 : 0,
    transform: bodyInView ? "none" : "translateY(20px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <section id="reviews" style={{ background: "#ffffff", borderTop: "0.5px solid #D3D1C7", padding: "72px 0 64px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 32px" }}>

        {/* ── Section header ── */}
        <div ref={headerRef} style={{ marginBottom: 48, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d32323", ...reveal(0) }}>
            06 — Review Language
          </div>
          <h2 style={{ fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.08, color: "#2C2C2A", margin: 0, ...reveal(60) }}>
            What do guests say — and why does it differ?
          </h2>
          <p style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.75, margin: 0, maxWidth: 560, ...reveal(120) }}>
            The words guests choose reveal far more than a star rating. Compare the most distinctive
            terms across rating buckets — filtered by cuisine or city.
            {data && (
              <span style={{ color: "#888780" }}> · {data.meta.total_reviews.toLocaleString()} reviews analysed</span>
            )}
          </p>
        </div>

        {/* ── Filters bar ── */}
        <div ref={bodyRef} style={{ ...bodyReveal(0) }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "14px 20px", background: "#ffffff", border: "0.5px solid #D3D1C7",
            borderRadius: 10, marginBottom: 24,
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888780", flexShrink: 0 }}>
              Filter
            </span>

            {/* Cuisine */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#888780", fontWeight: 600, whiteSpace: "nowrap" }}>Cuisine</label>
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                style={{ padding: "6px 10px", border: "0.5px solid #D3D1C7", borderRadius: 8, fontSize: 13, background: "#fff", color: "#2C2C2A", fontFamily: "inherit", cursor: "pointer" }}
              >
                <option value="All">All cuisines</option>
                {data?.meta?.cuisines?.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* City */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#888780", fontWeight: 600, whiteSpace: "nowrap" }}>City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{ padding: "6px 10px", border: "0.5px solid #D3D1C7", borderRadius: 8, fontSize: 13, background: "#fff", color: "#2C2C2A", fontFamily: "inherit", cursor: "pointer" }}
              >
                <option value="All">All cities</option>
                {data?.meta?.cities?.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Top N */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
              <label style={{ fontSize: 12, color: "#888780", fontWeight: 600, whiteSpace: "nowrap" }}>Show top {topN}</label>
              <input
                type="range" min={10} max={40} step={5} value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                style={{ width: 80, accentColor: "#d32323" }}
              />
            </div>

            {/* Reset */}
            <button
              onClick={() => { setSelectedCuisine("All"); setSelectedCity("All"); setLeftBucket("1-2"); setRightBucket("4.5-5"); setTopN(20); }}
              style={{ fontSize: 12, fontWeight: 600, color: "#d32323", background: "none", border: "none", cursor: "pointer", padding: "4px 0", fontFamily: "inherit", flexShrink: 0 }}
            >
              Reset
            </button>
          </div>

          {/* ── Main comparison area ── */}
          <div style={{
            background: "#ffffff", border: "0.5px solid #D3D1C7", borderRadius: 10,
            padding: 24, ...bodyReveal(80),
          }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#B4B2A9", fontSize: 14 }}>
                Loading review data…
              </div>
            ) : !data ? (
              <div style={{ padding: 60, textAlign: "center", color: "#B4B2A9", fontSize: 14 }}>
                Could not load review_language.json
              </div>
            ) : (
              <>
                {/* VS badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", background: BUCKET_BG[leftBucket], border: `0.5px solid ${BUCKET_COLORS[leftBucket]}33`, borderRadius: 20, fontSize: 13, fontWeight: 700, color: BUCKET_COLORS[leftBucket] }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: BUCKET_COLORS[leftBucket], display: "inline-block" }} />
                    {BUCKET_LABELS[leftBucket]} reviews
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#D3D1C7", letterSpacing: "0.05em" }}>VS</span>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", background: BUCKET_BG[rightBucket], border: `0.5px solid ${BUCKET_COLORS[rightBucket]}33`, borderRadius: 20, fontSize: 13, fontWeight: 700, color: BUCKET_COLORS[rightBucket] }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: BUCKET_COLORS[rightBucket], display: "inline-block" }} />
                    {BUCKET_LABELS[rightBucket]} reviews
                  </div>
                </div>

                {/* Side-by-side panels */}
                <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
                  <BarPanel terms={leftTerms}  bucket={leftBucket}  setBucket={setLeftBucket}  maxScore={maxScore} side="left" />
                  <div style={{ width: 1, background: "#D3D1C7", alignSelf: "stretch", flexShrink: 0 }} />
                  <BarPanel terms={rightTerms} bucket={rightBucket} setBucket={setRightBucket} maxScore={maxScore} side="right" />
                </div>

                {/* Insight callout */}
                {sharedInsight && (
                  <div style={{ marginTop: 20, padding: "14px 18px", background: "#ffffff", border: "0.5px solid #D3D1C7", borderLeft: "3px solid #d32323", borderRadius: 10, fontSize: 13, color: "#5F5E5A", lineHeight: 1.7 }}>
                    <strong style={{ color: "#2C2C2A" }}>Quick insight: </strong>
                    {sharedInsight.shared.length > 0
                      ? <>{sharedInsight.shared.length} word{sharedInsight.shared.length !== 1 ? "s" : ""} appear in both lists{sharedInsight.shared.length <= 5 && <> ({sharedInsight.shared.join(", ")})</>}. </>
                      : <>No words overlap between the two lists. </>
                    }
                    {sharedInsight.onlyLeft.length > 0 && <>Unique to <span style={{ color: BUCKET_COLORS[leftBucket], fontWeight: 600 }}>{BUCKET_LABELS[leftBucket]}</span>: {sharedInsight.onlyLeft.join(", ")}. </>}
                    {sharedInsight.onlyRight.length > 0 && <>Unique to <span style={{ color: BUCKET_COLORS[rightBucket], fontWeight: 600 }}>{BUCKET_LABELS[rightBucket]}</span>: {sharedInsight.onlyRight.join(", ")}.</>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── How to read callout ── */}
          <div style={{ marginTop: 14, padding: "14px 18px", background: "#ffffff", border: "0.5px solid #D3D1C7", borderLeft: "3px solid #D3D1C7", borderRadius: 10, fontSize: 13, color: "#5F5E5A", lineHeight: 1.7, ...bodyReveal(160) }}>
            <strong style={{ color: "#2C2C2A" }}>How to read this: </strong>
            Longer bars = more <em>distinctive</em> to that star level, not simply more frequent.
            Distinctiveness is measured by log-likelihood ratio — the words that disproportionately
            appear at one rating level compared to all others.
            Compare 1–2★ vs 4.5–5★ to see how negative reviews focus on <em>service failures</em>{" "}
            while top reviews highlight <em>specific dishes</em> and <em>atmosphere</em>.
          </div>
        </div>

      </div>
    </section>
  );
}
