import React, { useState, useEffect, useMemo, useRef } from "react";
import "./ReviewLanguageExplorer.css";

const BUCKET_ORDER = ["1-2", "3", "4", "4.5-5"];

const BUCKET_META = {
  "1-2":   { label: "1–2 ★", color: "#ef4444", bg: "#fef2f2", border: "#fca5a5", desc: "Frustrated guests"  },
  "3":     { label: "3 ★",   color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d", desc: "Mixed feelings"     },
  "4":     { label: "4 ★",   color: "#22c55e", bg: "#f0fdf4", border: "#86efac", desc: "Happy regulars"     },
  "4.5-5": { label: "4.5–5 ★", color: "#16a34a", bg: "#dcfce7", border: "#4ade80", desc: "Raving fans"     },
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

function BarChart({ terms, color, chartKey }) {
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(null);
  const maxScore = useMemo(() => Math.max(...terms.map(t => t.score), 1), [terms]);

  useEffect(() => {
    setReady(false);
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(t);
  }, [chartKey]);

  return (
    <div className="rl-chart">
      {terms.map((term, i) => {
        const pct   = (term.score / maxScore) * 100;
        const isHov = hovered === i;
        return (
          <div
            key={term.word}
            className={`rl-bar-row ${isHov ? "rl-bar-row--hov" : ""}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="rl-rank">{i + 1}</span>
            <span className="rl-word-label" style={{ color: isHov ? color : "#2C2C2A" }}>
              {term.word}
            </span>
            <div className="rl-bar-track">
              <div
                className="rl-bar-fill"
                style={{
                  width:           ready ? `${pct}%` : "0%",
                  background:      color,
                  opacity:         isHov ? 1 : 0.72,
                  transitionDelay: ready ? `${i * 25}ms` : "0ms",
                }}
              />
              {isHov && (
                <span className="rl-bar-tooltip" style={{ color, left: `calc(${pct}% + 8px)` }}>
                  #{i + 1} most distinctive
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BucketPanel({ side, bucket, setBucket, terms, loading, data, chartKey }) {
  const meta = BUCKET_META[bucket];
  return (
    <div className="rl-panel" style={{ borderColor: meta.border }}>
      {/* Panel bucket tabs */}
      <div className="rl-panel-tabs" style={{ background: meta.bg, borderBottomColor: meta.border }}>
        {BUCKET_ORDER.map(b => {
          const m      = BUCKET_META[b];
          const active = bucket === b;
          return (
            <button
              key={b}
              className={`rl-panel-tab ${active ? "rl-panel-tab--active" : ""}`}
              onClick={() => setBucket(b)}
              style={{
                "--tab-color":  m.color,
                "--tab-bg":     active ? "#ffffff" : "transparent",
                "--tab-border": m.border,
                color: active ? m.color : "#888780",
                borderColor: active ? m.border : "transparent",
                background: active ? "#ffffff" : "transparent",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Panel label */}
      <div className="rl-panel-label" style={{ borderBottomColor: meta.border, background: meta.bg }}>
        <span className="rl-panel-title" style={{ color: meta.color }}>{meta.label} reviews</span>
        <span className="rl-panel-desc">{meta.desc}</span>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="rl-empty">Loading…</div>
      ) : !data || terms.length === 0 ? (
        <div className="rl-empty">No data for this filter</div>
      ) : (
        <BarChart key={`${side}-${chartKey}`} terms={terms} color={meta.color} chartKey={`${side}-${chartKey}`} />
      )}
    </div>
  );
}

export default function ReviewLanguageExplorer() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const [leftBucket,  setLeftBucket]  = useState("1-2");
  const [rightBucket, setRightBucket] = useState("4.5-5");
  const [chartKey,    setChartKey]    = useState(0);

  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [selectedCity,    setSelectedCity]    = useState("All");
  const [topN, setTopN] = useState(15);

  const [headerRef, headerInView] = useInView(0.1);
  const [bodyRef,   bodyInView]   = useInView(0.05);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}review_language.json`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getTerms = (bucket) => {
    if (!data) return [];
    let src = data.global;
    if (selectedCuisine !== "All" && data.by_cuisine?.[selectedCuisine]) src = data.by_cuisine[selectedCuisine];
    if (selectedCity    !== "All" && data.by_city?.[selectedCity])        src = data.by_city[selectedCity];
    return (src[bucket] || []).slice(0, topN);
  };

  const leftTerms  = useMemo(() => getTerms(leftBucket),  [data, leftBucket,  selectedCuisine, selectedCity, topN]);
  const rightTerms = useMemo(() => getTerms(rightBucket), [data, rightBucket, selectedCuisine, selectedCity, topN]);

  const reveal = (delay = 0) => ({
    opacity:   headerInView ? 1 : 0,
    transform: headerInView ? "none" : "translateY(18px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  const bump = () => setChartKey(k => k + 1);

  return (
    <section id="reviews" className="rl-section">
      <div className="rl-inner">

        {/* Header */}
        <div ref={headerRef} className="rl-header">
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d32323", ...reveal(0) }}>
            06 — Review Language
          </div>
          <h2 style={{ fontSize: "clamp(28px,3.8vw,48px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.08, color: "#2C2C2A", margin: 0, ...reveal(60) }}>
            What do guests actually say?
          </h2>
          <p style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.75, margin: 0, maxWidth: 560, ...reveal(120) }}>
            Pick any two star buckets and compare the most distinctive words side by side —
            ranked by how disproportionately they appear at that rating vs. all others.
          </p>
        </div>

        <div ref={bodyRef} style={{ opacity: bodyInView ? 1 : 0, transform: bodyInView ? "none" : "translateY(14px)", transition: "opacity 0.6s, transform 0.6s", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Shared filters */}
          <div className="rl-filters">
            <span className="rl-filter-label">Filter</span>
            <select value={selectedCuisine} onChange={e => { setSelectedCuisine(e.target.value); bump(); }} className="rl-select">
              <option value="All">All cuisines</option>
              {data?.meta?.cuisines?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedCity} onChange={e => { setSelectedCity(e.target.value); bump(); }} className="rl-select">
              <option value="All">All cities</option>
              {data?.meta?.cities?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="rl-topn">
              <span className="rl-topn-label">Top {topN}</span>
              <input type="range" min={10} max={40} step={5} value={topN}
                onChange={e => { setTopN(Number(e.target.value)); bump(); }}
                style={{ accentColor: "#d32323", width: 72 }} />
            </div>
          </div>

          {/* Side-by-side panels */}
          <div className="rl-compare-grid">
            <BucketPanel
              side="left"
              bucket={leftBucket}
              setBucket={b => { setLeftBucket(b); bump(); }}
              terms={leftTerms}
              loading={loading}
              data={data}
              chartKey={chartKey}
            />
            <BucketPanel
              side="right"
              bucket={rightBucket}
              setBucket={b => { setRightBucket(b); bump(); }}
              terms={rightTerms}
              loading={loading}
              data={data}
              chartKey={chartKey}
            />
          </div>

          {/* Footer note */}
          <div className="rl-note">
            <strong style={{ color: "#2C2C2A" }}>How distinctiveness is measured: </strong>
            Each word is scored using the <em>log-likelihood ratio</em> (G²) — a statistical test
            that asks: given how often this word appears across all reviews, how surprising is it
            that it shows up this much more in one star bucket? A word with 500 uses that
            concentrates 90% in 1–2 ★ reviews scores far higher than a word with 50,000 uses
            spread evenly across all buckets. Bar length reflects that surprise score, not raw count.
          </div>
        </div>

      </div>
    </section>
  );
}
