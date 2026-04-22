import React, { useState, useMemo, useRef, useEffect } from 'react';

const STEPS = [
  {
    id: 'all',
    highlight: null,
    num: '01',
    title: 'Every amenity, one map',
    body: 'Twelve extras, plotted simultaneously by how much they lift ratings (→) and how much they boost check-ins (↑). Two axes, one answer.',
    accentColor: '#888780',
  },
  {
    id: 'experience',
    highlight: 'experience',
    num: '02',
    title: 'Some extras elevate the visit',
    body: 'A patio, free WiFi, the ability to book ahead — these cluster bottom-right: strong rating lift, modest traffic gain. Guests notice when a place is designed around the moment.',
    accentColor: '#E24B4A',
  },
  {
    id: 'convenience',
    highlight: 'convenience',
    num: '03',
    title: 'Others just make it easy',
    body: 'Delivery, takeout, space for big groups — these dominate the top-left: massive foot traffic, modest rating impact. Convenience brings people back; it just doesn\'t earn better reviews.',
    accentColor: '#185FA5',
  },
  {
    id: 'gap',
    highlight: 'all',
    num: '04',
    title: 'Zero overlap. Two games.',
    body: 'Not one amenity appears in both top lists. Experience and convenience attract different expectations — and knowing which game you\'re playing is the whole strategy.',
    accentColor: '#2C2C2A',
  },
];

const amenityAssociations = {
  rating: [
    { amenity: 'Outdoor seating',        association: 0.34, with: 3.68, without: 3.34 },
    { amenity: 'Free WiFi',              association: 0.28, with: 3.72, without: 3.44 },
    { amenity: 'Reservations available', association: 0.26, with: 3.65, without: 3.39 },
    { amenity: 'Full bar',               association: 0.24, with: 3.61, without: 3.37 },
    { amenity: 'Delivery',               association: 0.18, with: 3.58, without: 3.40 },
    { amenity: 'Wheelchair accessible',  association: 0.17, with: 3.62, without: 3.45 },
    { amenity: 'Table service',          association: 0.16, with: 3.59, without: 3.43 },
    { amenity: 'Takeout',                association: 0.14, with: 3.56, without: 3.42 },
    { amenity: 'Good for groups',        association: 0.12, with: 3.54, without: 3.42 },
    { amenity: 'Parking available',      association: 0.11, with: 3.52, without: 3.41 },
    { amenity: 'TV',                     association: 0.08, with: 3.50, without: 3.42 },
    { amenity: 'Bike parking',           association: 0.06, with: 3.49, without: 3.43 },
  ],
  checkins: [
    { amenity: 'Delivery',               association: 47.2, with: 89.3,  without: 42.1 },
    { amenity: 'Takeout',                association: 38.5, with: 82.1,  without: 43.6 },
    { amenity: 'Good for groups',        association: 31.8, with: 78.5,  without: 46.7 },
    { amenity: 'Full bar',               association: 29.3, with: 75.2,  without: 45.9 },
    { amenity: 'Outdoor seating',        association: 26.4, with: 71.3,  without: 44.9 },
    { amenity: 'Free WiFi',              association: 24.7, with: 69.8,  without: 45.1 },
    { amenity: 'Reservations available', association: 18.5, with: 63.2,  without: 44.7 },
    { amenity: 'Table service',          association: 16.2, with: 61.5,  without: 45.3 },
    { amenity: 'Wheelchair accessible',  association: 12.3, with: 57.1,  without: 44.8 },
    { amenity: 'Parking available',      association: 10.4, with: 55.2,  without: 44.8 },
    { amenity: 'TV',                     association: 8.7,  with: 53.4,  without: 44.7 },
    { amenity: 'Bike parking',           association: 5.2,  with: 50.1,  without: 44.9 },
  ],
};

// SVG scatter constants
const SVG_W = 490, SVG_H = 400;
const M = { top: 35, right: 60, bottom: 52, left: 48 };
const PW = SVG_W - M.left - M.right; // 382
const PH = SVG_H - M.top  - M.bottom; // 313
const X_MAX = 0.40, Y_MAX = 55;
const X_Q = 0.195, Y_Q = 27.5;
const toX = (v) => (v / X_MAX) * PW;
const toY = (v) => PH - (v / Y_MAX) * PH;
const xQpx = toX(X_Q);
const yQpx = toY(Y_Q);

const quadrantColor = (ra, ca) => {
  if (ra >= X_Q && ca >= Y_Q) return '#BA7517';
  if (ra <  X_Q && ca >= Y_Q) return '#185FA5';
  if (ra >= X_Q && ca <  Y_Q) return '#E24B4A';
  return '#888780';
};
const quadrantLabel = (ra, ca) => {
  if (ra >= X_Q && ca >= Y_Q) return 'Versatile';
  if (ra <  X_Q && ca >= Y_Q) return 'Crowd magnet';
  if (ra >= X_Q && ca <  Y_Q) return 'Experience maker';
  return 'Table stakes';
};

const LABEL_OFFSETS = {
  'Outdoor seating':        { anchor: 'start', dx:  10, dy:   4 },
  'Free WiFi':              { anchor: 'start', dx:  10, dy:  16 },
  'Reservations available': { anchor: 'start', dx:  10, dy:   4 },
  'Full bar':               { anchor: 'start', dx:  10, dy:  -8 },
  'Delivery':               { anchor: 'end',   dx: -10, dy: -10 },
  'Wheelchair accessible':  { anchor: 'start', dx:  10, dy:   8 },
  'Table service':          { anchor: 'start', dx:  10, dy: -10 },
  'Takeout':                { anchor: 'end',   dx: -10, dy:   4 },
  'Good for groups':        { anchor: 'end',   dx: -10, dy:   4 },
  'Parking available':      { anchor: 'start', dx:   8, dy:  14 },
  'TV':                     { anchor: 'end',   dx: -10, dy: -14 },
  'Bike parking':           { anchor: 'end',   dx: -10, dy:   4 },
};

export default function AmenityAssociationPage() {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [dotsVisible,   setDotsVisible]   = useState(false);
  const [activeStep,    setActiveStep]    = useState(0);
  const [hoveredAmenity, setHoveredAmenity] = useState(null);

  const headerRef  = useRef(null);
  const scrollyRef = useRef(null);
  const stepRefs   = useRef([]);

  // Header fade-in
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setHeaderVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    if (headerRef.current) obs.observe(headerRef.current);
    return () => obs.disconnect();
  }, []);

  // Dots animate in when the scrollytelling section enters the viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setDotsVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    if (scrollyRef.current) obs.observe(scrollyRef.current);
    return () => obs.disconnect();
  }, []);

  // Track which step is closest to viewport centre
  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight / 2;
      let best = 0, bestDist = Infinity;
      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActiveStep(best);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scatterData = useMemo(() =>
    amenityAssociations.rating.map(r => {
      const c = amenityAssociations.checkins.find(ci => ci.amenity === r.amenity);
      return { amenity: r.amenity, ratingAssoc: r.association, checkinAssoc: c.association,
               ratingWith: r.with, ratingWithout: r.without, checkinWith: c.with, checkinWithout: c.without };
    }), []
  );

  const getDotOpacity = (d) => {
    if (!dotsVisible) return 0;
    const h = STEPS[activeStep].highlight;
    if (!h || h === 'all') return 1;
    const ra = d.ratingAssoc, ca = d.checkinAssoc;
    if (h === 'experience')  return ra >= X_Q          ? 1 : 0.08;
    if (h === 'convenience') return ca >= Y_Q && ra < X_Q ? 1 : 0.08;
    return 1;
  };

  const revealStyle = (delay) => ({
    opacity: headerVisible ? 1 : 0,
    transform: headerVisible ? 'none' : 'translateY(24px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  const step = STEPS[activeStep];

  return (
    <div style={{ padding: '2rem 3rem 3rem' }}>

      {/* ── Two-column intro: left = headline, right = top-3 comparison ── */}
      <div
        ref={headerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          alignItems: 'start',
          marginBottom: '3rem',
          paddingBottom: '2.5rem',
          borderBottom: '0.5px solid #D3D1C7',
        }}
      >
        {/* Left: headline block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ ...revealStyle(0) }}>
            <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d32323', marginBottom: '14px' }}>
              04 — Amenities
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: '800', letterSpacing: '-1.5px', lineHeight: '1.1', color: '#2C2C2A', margin: '0 0 16px' }}>
              What shapes a restaurant's reputation?
            </h1>
            <p style={{ fontSize: '15px', color: '#5F5E5A', lineHeight: '1.7', margin: 0, maxWidth: '440px' }}>
              Not every amenity moves the needle — but some do. Explore how specific extras
              connect to the ratings guests leave and how often they return.
            </p>
          </div>

          {/* Insight callout */}
          <div style={{ padding: '14px 18px', background: 'white', border: '0.5px solid #D3D1C7', borderLeft: '3px solid #d32323', borderRadius: '10px', fontSize: '13px', color: '#5F5E5A', lineHeight: '1.7', ...revealStyle(180) }}>
            The extras that earn high ratings — a patio, WiFi, the ability to book ahead — are about
            the <em>experience</em>. The extras that drive repeat visits — delivery, takeout, group-friendly
            tables — are about <em>convenience</em>. Scroll to see exactly where each one lands.
          </div>
        </div>

        {/* Right: top-3 comparison */}
        <div style={{ ...revealStyle(120) }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '14px' }}>
            The split at a glance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Stars column */}
            <div style={{ padding: '16px', border: '0.5px solid #D3D1C7', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888780' }}>What earns stars</div>
              {amenityAssociations.rating.slice(0, 3).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: ['#E24B4A','#BA7517','#378ADD'][i], color: 'white', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2A' }}>{item.amenity}</div>
                    <div style={{ fontSize: '11px', color: '#888780' }}>+{item.association.toFixed(2)} stars</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Check-ins column */}
            <div style={{ padding: '16px', border: '0.5px solid #D3D1C7', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888780' }}>What draws crowds</div>
              {amenityAssociations.checkins.slice(0, 3).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: ['#E24B4A','#BA7517','#378ADD'][i], color: 'white', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2A' }}>{item.amenity}</div>
                    <div style={{ fontSize: '11px', color: '#888780' }}>+{Math.round(item.association)} check-ins</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollytelling ── */}
      <div
        ref={scrollyRef}
        style={{ position: 'relative', display: 'grid', gridTemplateColumns: '36% 1fr', gap: '4%', alignItems: 'start' }}
      >
        {/* LEFT: narrative steps */}
        <div>
          {STEPS.map((s, i) => {
            const isActive = activeStep === i;
            return (
              <div
                key={s.id}
                ref={el => stepRefs.current[i] = el}
                style={{ minHeight: '88vh', display: 'flex', alignItems: 'center', paddingBottom: i === STEPS.length - 1 ? '4rem' : 0 }}
              >
                <div style={{
                  background: 'white',
                  border: `0.5px solid ${isActive ? s.accentColor : '#D3D1C7'}`,
                  borderLeft: `3px solid ${isActive ? s.accentColor : '#E8E6DF'}`,
                  borderRadius: '10px',
                  padding: '1.5rem',
                  opacity: isActive ? 1 : 0.38,
                  transform: isActive ? 'translateX(0)' : 'translateX(-10px)',
                  transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: isActive ? '0 4px 22px rgba(0,0,0,0.08)' : 'none',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: s.accentColor, letterSpacing: '0.12em', marginBottom: '0.65rem', transition: 'color 0.4s' }}>
                    {s.num} / {STEPS.length.toString().padStart(2, '0')}
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: '500', color: '#2C2C2A', margin: '0 0 0.65rem', lineHeight: '1.25' }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#5F5E5A', margin: 0, lineHeight: '1.75' }}>
                    {s.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: sticky chart */}
        <div style={{ position: 'sticky', top: '10vh' }}>
          <div style={{
            background: 'white',
            border: '0.5px solid #D3D1C7',
            borderRadius: '14px',
            padding: '1.25rem 1rem 0.75rem',
            boxShadow: '0 4px 28px rgba(0,0,0,0.07)',
          }}>
            {/* Chart header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2A' }}>Where every amenity lands</span>
              <span style={{
                fontSize: '11px', fontWeight: '700', color: step.accentColor,
                background: '#F1EFE8', borderRadius: '20px', padding: '3px 10px',
                transition: 'color 0.45s',
              }}>
                {step.num}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '2px', background: '#EBEBEB', borderRadius: '2px', marginBottom: '0.9rem', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((activeStep + 1) / STEPS.length) * 100}%`,
                background: step.accentColor,
                borderRadius: '2px',
                transition: 'width 0.55s cubic-bezier(0.16,1,0.3,1), background 0.45s',
              }} />
            </div>

            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ width: '100%', display: 'block', overflow: 'visible' }}
              onMouseLeave={() => setHoveredAmenity(null)}
            >
              <defs>
                <filter id="tip-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.10" />
                </filter>
              </defs>

              <g transform={`translate(${M.left},${M.top})`}>
                {/* Quadrant fills */}
                <rect x={0}    y={0}    width={xQpx}      height={yQpx}      fill="#EBF3FD" opacity={0.65} />
                <rect x={xQpx} y={0}    width={PW - xQpx}  height={yQpx}      fill="#FEF5E6" opacity={0.65} />
                <rect x={xQpx} y={yQpx} width={PW - xQpx}  height={PH - yQpx} fill="#FEF0F0" opacity={0.65} />
                <rect x={0}    y={yQpx} width={xQpx}       height={PH - yQpx} fill="#F5F5F3" opacity={0.65} />

                {/* Quadrant labels */}
                {[
                  { x: 7,       y: 16,       text: 'CROWD MAGNETS', fill: '#185FA5', anchor: 'start', active: step.highlight === 'convenience' },
                  { x: PW - 7,  y: 16,       text: 'VERSATILE',     fill: '#BA7517', anchor: 'end',   active: false },
                  { x: PW - 7,  y: PH - 8,   text: 'EXPERIENCE',    fill: '#C0392B', anchor: 'end',   active: step.highlight === 'experience' },
                  { x: 7,       y: PH - 8,   text: 'TABLE STAKES',  fill: '#888780', anchor: 'start', active: false },
                ].map(q => (
                  <text key={q.text} x={q.x} y={q.y} textAnchor={q.anchor} fontSize={9} fontWeight={700}
                    fill={q.fill} letterSpacing="0.07em"
                    style={{ opacity: q.active ? 1 : 0.45, transition: 'opacity 0.4s' }}>
                    {q.text}
                  </text>
                ))}

                {/* Threshold lines */}
                <line x1={xQpx} y1={0}    x2={xQpx} y2={PH} stroke="#C5C3BA" strokeWidth={1} strokeDasharray="4,3" />
                <line x1={0}    y1={yQpx} x2={PW}   y2={yQpx} stroke="#C5C3BA" strokeWidth={1} strokeDasharray="4,3" />

                {/* Axes */}
                <line x1={0} y1={PH} x2={PW} y2={PH} stroke="#B4B2A9" strokeWidth={1} />
                <line x1={0} y1={0}  x2={0}  y2={PH} stroke="#B4B2A9" strokeWidth={1} />

                {/* X ticks */}
                {[0, 0.10, 0.20, 0.30, 0.40].map(v => (
                  <g key={v} transform={`translate(${toX(v)},${PH})`}>
                    <line y2={5} stroke="#B4B2A9" strokeWidth={1} />
                    <text y={17} textAnchor="middle" fontSize={10} fill="#888780">{v === 0 ? '0' : `+${v.toFixed(2)}`}</text>
                  </g>
                ))}
                <text x={PW / 2} y={PH + 40} textAnchor="middle" fontSize={11} fontWeight={500} fill="#5F5E5A">
                  Rating boost (avg. ★ difference: with vs. without)
                </text>

                {/* Y ticks */}
                {[0, 10, 20, 30, 40, 50].map(v => (
                  <g key={v} transform={`translate(0,${toY(v)})`}>
                    <line x2={-5} stroke="#B4B2A9" strokeWidth={1} />
                    <text x={-8} textAnchor="end" fontSize={10} fill="#888780" dominantBaseline="middle">{v === 0 ? '0' : `+${v}`}</text>
                  </g>
                ))}
                <text transform={`translate(${-32},${PH / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fontWeight={500} fill="#5F5E5A">
                  Check-in boost
                </text>

                {/* Dots + labels */}
                {scatterData.map((d, i) => {
                  const cx = toX(d.ratingAssoc);
                  const cy = toY(d.checkinAssoc);
                  const isHovered = hoveredAmenity === d.amenity;
                  const lbl = LABEL_OFFSETS[d.amenity];
                  const color = quadrantColor(d.ratingAssoc, d.checkinAssoc);
                  const op = getDotOpacity(d);
                  return (
                    <g key={d.amenity}
                      onMouseEnter={() => setHoveredAmenity(d.amenity)}
                      onMouseLeave={() => setHoveredAmenity(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <g transform={`translate(${cx},${cy})`}>
                        <circle r={6} fill={color} stroke="white" strokeWidth={2}
                          style={{
                            opacity: op,
                            transform: isHovered ? 'scale(1.6)' : 'scale(1)',
                            transformOrigin: '0px 0px',
                            transition: `opacity 0.4s ease ${dotsVisible ? i * 50 : 0}ms, transform 0.15s ease`,
                            filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' : 'none',
                          }}
                        />
                      </g>
                      <text x={cx + lbl.dx} y={cy + lbl.dy} textAnchor={lbl.anchor} fontSize={11}
                        fill={isHovered ? '#2C2C2A' : '#5F5E5A'}
                        fontWeight={isHovered ? '600' : '400'}
                        style={{ pointerEvents: 'none', opacity: op, transition: `opacity 0.4s ease ${dotsVisible ? i * 50 : 0}ms, fill 0.15s` }}
                      >
                        {d.amenity}
                      </text>
                    </g>
                  );
                })}

                {/* Hover tooltip */}
                {hoveredAmenity && (() => {
                  const d = scatterData.find(s => s.amenity === hoveredAmenity);
                  if (!d) return null;
                  const cx = toX(d.ratingAssoc), cy = toY(d.checkinAssoc);
                  const TW = 192, TH = 94;
                  const tx = cx > PW * 0.55 ? cx - TW - 14 : cx + 14;
                  const ty = Math.max(4, Math.min(cy - TH / 2, PH - TH - 4));
                  const color = quadrantColor(d.ratingAssoc, d.checkinAssoc);
                  return (
                    <g transform={`translate(${tx},${ty})`} style={{ pointerEvents: 'none' }}>
                      <rect width={TW} height={TH} rx={7} fill="white" stroke="#D3D1C7" strokeWidth={0.5} filter="url(#tip-shadow)" />
                      <text x={12} y={20} fontSize={12} fontWeight={600} fill="#2C2C2A">{d.amenity}</text>
                      <rect x={12} y={30} width={7} height={7} rx={2} fill={color} />
                      <text x={23} y={38} fontSize={10} fill={color} fontWeight={600}>{quadrantLabel(d.ratingAssoc, d.checkinAssoc)}</text>
                      <line x1={12} y1={47} x2={TW - 12} y2={47} stroke="#E8E6DF" strokeWidth={0.5} />
                      <text x={12} y={62} fontSize={10} fill="#888780">
                        Ratings: <tspan fontWeight={600} fill="#2C2C2A">{d.ratingWith.toFixed(2)}★</tspan> with · <tspan fontWeight={600} fill="#2C2C2A">{d.ratingWithout.toFixed(2)}★</tspan> without
                      </text>
                      <text x={12} y={79} fontSize={10} fill="#888780">
                        Check-ins: <tspan fontWeight={600} fill="#2C2C2A">{Math.round(d.checkinWith)}</tspan> with · <tspan fontWeight={600} fill="#2C2C2A">{Math.round(d.checkinWithout)}</tspan> without
                      </text>
                    </g>
                  );
                })()}
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Reading the chart ── */}
      <div style={{ marginTop: '3rem', marginBottom: '0', padding: '28px 32px', background: 'white', border: '0.5px solid #D3D1C7', borderLeft: '3px solid #2C2C2A', borderRadius: '10px' }}>
        <p style={{ margin: '0 0 10px', fontWeight: '800', color: '#2C2C2A', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Reading the chart</p>
        <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '500', color: '#2C2C2A', lineHeight: '1.5' }}>
          The four quadrants tell the story.
        </p>
        <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#5F5E5A', lineHeight: '1.75' }}>
          <strong style={{ color: '#C0392B' }}>Experience makers</strong> (bottom-right) boost ratings —
          a patio, free WiFi, the ability to book ahead all elevate how a visit feels.{' '}
          <strong style={{ color: '#185FA5' }}>Crowd magnets</strong> (top-left) drive foot traffic
          through convenience: delivery, takeout, and space for big parties.
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#888780', lineHeight: '1.75' }}>
          These are associations, not causes — hover any dot to compare the "with" vs. "without"
          numbers for both dimensions at once.
        </p>
      </div>

    </div>
  );
}
