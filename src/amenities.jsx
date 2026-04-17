import React, { useState, useMemo, useRef, useEffect } from 'react';

export default function AmenityAssociationPage() {
  const [metric, setMetric] = useState('rating');
  const [barsVisible, setBarsVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const chartRef  = useRef(null);
  const headerRef = useRef(null);

  // Observe chart container — animate bars in once visible
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setBarsVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    if (chartRef.current) obs.observe(chartRef.current);
    return () => obs.disconnect();
  }, []);

  // Observe header
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHeaderVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    if (headerRef.current) obs.observe(headerRef.current);
    return () => obs.disconnect();
  }, []);

  // Re-animate bars when metric changes
  const prevMetric = useRef(metric);
  useEffect(() => {
    if (prevMetric.current !== metric && barsVisible) {
      setBarsVisible(false);
      const t = setTimeout(() => setBarsVisible(true), 30);
      prevMetric.current = metric;
      return () => clearTimeout(t);
    }
    prevMetric.current = metric;
  }, [metric]);
  
  // Amenity association data: difference between restaurants WITH vs WITHOUT each amenity
  const amenityAssociations = {
    rating: [
      { amenity: 'Outdoor seating', association: 0.34, with: 3.68, without: 3.34 },
      { amenity: 'Free WiFi', association: 0.28, with: 3.72, without: 3.44 },
      { amenity: 'Reservations available', association: 0.26, with: 3.65, without: 3.39 },
      { amenity: 'Full bar', association: 0.24, with: 3.61, without: 3.37 },
      { amenity: 'Delivery', association: 0.18, with: 3.58, without: 3.40 },
      { amenity: 'Wheelchair accessible', association: 0.17, with: 3.62, without: 3.45 },
      { amenity: 'Table service', association: 0.16, with: 3.59, without: 3.43 },
      { amenity: 'Takeout', association: 0.14, with: 3.56, without: 3.42 },
      { amenity: 'Good for groups', association: 0.12, with: 3.54, without: 3.42 },
      { amenity: 'Parking available', association: 0.11, with: 3.52, without: 3.41 },
      { amenity: 'TV', association: 0.08, with: 3.50, without: 3.42 },
      { amenity: 'Bike parking', association: 0.06, with: 3.49, without: 3.43 },
    ],
    checkins: [
      { amenity: 'Delivery', association: 47.2, with: 89.3, without: 42.1 },
      { amenity: 'Takeout', association: 38.5, with: 82.1, without: 43.6 },
      { amenity: 'Good for groups', association: 31.8, with: 78.5, without: 46.7 },
      { amenity: 'Full bar', association: 29.3, with: 75.2, without: 45.9 },
      { amenity: 'Outdoor seating', association: 26.4, with: 71.3, without: 44.9 },
      { amenity: 'Free WiFi', association: 24.7, with: 69.8, without: 45.1 },
      { amenity: 'Reservations available', association: 18.5, with: 63.2, without: 44.7 },
      { amenity: 'Table service', association: 16.2, with: 61.5, without: 45.3 },
      { amenity: 'Wheelchair accessible', association: 12.3, with: 57.1, without: 44.8 },
      { amenity: 'Parking available', association: 10.4, with: 55.2, without: 44.8 },
      { amenity: 'TV', association: 8.7, with: 53.4, without: 44.7 },
      { amenity: 'Bike parking', association: 5.2, with: 50.1, without: 44.9 },
    ]
  };

  const data = metric === 'rating' ? amenityAssociations.rating : amenityAssociations.checkins;
  const sorted = [...data].sort((a, b) => b.association - a.association);
  const maxAssoc = Math.max(...sorted.map(d => d.association));

  // Get color based on association strength
  const getColor = (assoc) => {
    const ratio = assoc / maxAssoc;
    if (ratio > 0.75) return '#E24B4A'; // Red for strong
    if (ratio > 0.5) return '#BA7517'; // Amber for moderate-strong
    if (ratio > 0.25) return '#378ADD'; // Blue for moderate
    return '#B4B2A9'; // Gray for weak
  };

  const revealStyle = (delay) => ({
    opacity: headerVisible ? 1 : 0,
    transform: headerVisible ? 'none' : 'translateY(24px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }} ref={headerRef}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '500',
          margin: '0 0 0.5rem 0',
          color: '#2C2C2A',
          ...revealStyle(0),
        }}>
          Amenity Association Explorer
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#888780',
          margin: '0',
          maxWidth: '600px',
          ...revealStyle(100),
        }}>
          Discover how restaurant amenities associate with ratings and check-in counts.
          Select a metric below to explore the data.
        </p>
      </div>

      {/* Metric selector */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '2rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        ...revealStyle(200),
      }}>
        <label style={{ 
          fontSize: '14px', 
          color: '#444441',
          fontWeight: '500'
        }}>
          Show associations with:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMetric('rating')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              borderRadius: '8px',
              border: metric === 'rating' 
                ? '2px solid #185FA5' 
                : '0.5px solid #B4B2A9',
              backgroundColor: metric === 'rating' 
                ? '#E6F1FB' 
                : 'white',
              color: metric === 'rating' 
                ? '#185FA5' 
                : '#444441',
              fontWeight: metric === 'rating' ? '500' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Average rating
          </button>
          <button
            onClick={() => setMetric('checkins')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              borderRadius: '8px',
              border: metric === 'checkins' 
                ? '2px solid #185FA5' 
                : '0.5px solid #B4B2A9',
              backgroundColor: metric === 'checkins' 
                ? '#E6F1FB' 
                : 'white',
              color: metric === 'checkins' 
                ? '#185FA5' 
                : '#444441',
              fontWeight: metric === 'checkins' ? '500' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Check-in count
          </button>
        </div>
      </div>

      {/* Summary metric */}
      <div style={{
        background: '#F1EFE8',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '1.5rem',
        ...revealStyle(320),
      }}>
        <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>
          Strongest association
        </div>
        <div style={{ fontSize: '18px', fontWeight: '500', color: '#2C2C2A' }}>
          {sorted[0].amenity}
        </div>
        <div style={{ fontSize: '13px', color: '#888780', marginTop: '4px' }}>
          {metric === 'rating' 
            ? `+${sorted[0].association.toFixed(2)} rating points`
            : `+${Math.round(sorted[0].association)} avg check-ins`
          }
        </div>
      </div>

      {/* Horizontal bar chart */}
      <div
        ref={chartRef}
        style={{
          background: 'white',
          border: '0.5px solid #D3D1C7',
          borderRadius: '12px',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: '500', 
          margin: '0 0 1.5rem 0',
          color: '#2C2C2A'
        }}>
          {metric === 'rating' ? 'Rating associations' : 'Check-in associations'}
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {sorted.map((item, idx) => (
            <div
              key={idx}
              style={{
                opacity: barsVisible ? 1 : 0,
                transform: barsVisible ? 'none' : 'translateY(12px)',
                transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${idx * 50}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${idx * 50}ms`,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <div style={{
                  fontSize: '13px',
                  color: '#444441',
                  fontWeight: '500',
                  flex: '0 0 200px'
                }}>
                  {item.amenity}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#888780'
                }}>
                  {metric === 'rating'
                    ? `+${item.association.toFixed(2)}`
                    : `+${Math.round(item.association)}`
                  }
                </div>
              </div>

              <div style={{
                height: '28px',
                backgroundColor: '#F1EFE8',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div
                  style={{
                    height: '100%',
                    width: barsVisible ? `${(item.association / maxAssoc) * 100}%` : '0%',
                    backgroundColor: getColor(item.association),
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    paddingRight: '8px',
                    justifyContent: 'flex-end',
                    transition: `width 0.75s cubic-bezier(0.16,1,0.3,1) ${idx * 55}ms`,
                  }}
                >
                  {(item.association / maxAssoc) > 0.15 && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '500',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>
                      {metric === 'rating' 
                        ? `${item.association.toFixed(2)}`
                        : `${Math.round(item.association)}`
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* Comparison stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '8px',
                fontSize: '11px',
                color: '#888780'
              }}>
                <div>With amenity: <strong style={{ color: '#2C2C2A' }}>
                  {metric === 'rating' 
                    ? item.with.toFixed(2)
                    : Math.round(item.with)
                  }
                </strong></div>
                <div>Without amenity: <strong style={{ color: '#2C2C2A' }}>
                  {metric === 'rating' 
                    ? item.without.toFixed(2)
                    : Math.round(item.without)
                  }
                </strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend and explanation */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#F1EFE8',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#5F5E5A',
        lineHeight: '1.6'
      }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', color: '#444441' }}>
          How to interpret the bars:
        </p>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
          <li><strong>Red bars (strong association):</strong> This amenity is more strongly associated with the selected metric</li>
          <li><strong>Amber bars (moderate):</strong> Medium level of association</li>
          <li><strong>Blue bars (weaker):</strong> Lower association strength</li>
          <li><strong>Gray bars (minimal):</strong> Very weak association</li>
        </ul>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          The numbers below each amenity show the average difference. For example, 
          "+0.34" means restaurants with that amenity have ratings 0.34 points higher 
          on average than those without it—but other factors may explain this difference.
        </p>
      </div>

    </div>
  );
}