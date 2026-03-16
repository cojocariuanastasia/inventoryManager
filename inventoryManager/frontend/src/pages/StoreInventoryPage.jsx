import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // CRITICAL: Map will break without this

const LOW_STOCK_THRESHOLD = 3;

// 1. CSS for the pulsing effect
const mapStyles = `
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.7; }
    80% { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  .marker-normal {
    background-color: #3b82f6; /* Blue */
    border: 3px solid white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  .marker-pulse {
    background-color: #dc2626; /* Red */
    border: 3px solid white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.28);
    /* Removed position: relative; here */
  }
  .marker-pulse::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(220, 38, 38, 0.45);
    transform: translate(-50%, -50%);
    animation: pulse-ring 1.5s infinite;
    pointer-events: none;
  }
  .marker-selected-blue {
    background-color: #3b82f6;
    border: 4px solid #fbbf24;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.25), 0 2px 8px rgba(0,0,0,0.35);
  }
  .marker-selected-red {
    background-color: #dc2626;
    border: 4px solid #fbbf24;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.25), 0 2px 8px rgba(0,0,0,0.35);
  }
`;

// Inject the CSS into the document
const styleSheet = document.createElement("style");
styleSheet.innerText = mapStyles;
document.head.appendChild(styleSheet);

// 2. Define the custom icons using Leaflet's divIcon
const normalIcon = new L.divIcon({
  className: 'marker-normal',
  iconSize: [16, 16],
  iconAnchor: [8, 8], // Centers the icon on the coordinate
});

const pulsingIcon = new L.divIcon({
  className: 'marker-pulse',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const selectedBlueIcon = new L.divIcon({
  className: 'marker-selected-blue',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const selectedRedIcon = new L.divIcon({
  className: 'marker-selected-red',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// 3. The Map Component
export function StoreMap({ stores, onStoreSelect, selectedStoreName }) {
  // Center roughly on the USA
  const mapCenter = [39.8283, -98.5795]; 

  return (
    <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
      <MapContainer center={mapCenter} zoom={4} style={{ height: '100%', width: '100%' }}>
        {/* The free OpenStreetMap tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {stores.map((store) => {
          // Check if we have coordinates for this store, skip if not
          // Ensure the latitude and longitude are converted to numbers
          const lat = parseFloat(store.latitude);
          const lon = parseFloat(store.longitude);

          // If the database didn't send coordinates for some reason, skip placing the pin
          if (isNaN(lat) || isNaN(lon)) return null; 
          const coords = [lat, lon];

          const needsAttention = Boolean(store.needsAttention);
          const isSelected = selectedStoreName === store.name;
          const markerIcon = isSelected
            ? (needsAttention ? selectedRedIcon : selectedBlueIcon)
            : (needsAttention ? pulsingIcon : normalIcon);

          return (
            <Marker 
              key={store.name} 
              position={coords}
              icon={markerIcon}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => onStoreSelect(store),
              }}
            >
              <Popup>
                <strong style={{ display: 'block', marginBottom: '4px' }}>{store.name}</strong>
                {needsAttention ? (
                  <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Needs Attention (Low Stock)</span>
                ) : (
                  <span style={{ color: '#16a34a' }}>Stock Available: {store.totalAvailable}</span>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function TransferSuggestionPanel({ suggestion, onClear }) {
  return (
    <div
      style={{
        borderRadius: '14px',
        backgroundColor: '#fff',
        boxShadow: '0 8px 24px rgba(2, 6, 23, 0.12)',
        padding: '20px',
        border: '1px solid #e2e8f0',
        width: '100%',
        height: '260px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <h2 style={{ margin: '0 0 12px', color: '#1e293b' }}>Relocation Suggestion</h2>

      <div style={{ flex: 1, overflowY: 'scroll', scrollbarGutter: 'stable', minHeight: 0 }}>
        {!suggestion && (
          <p style={{ margin: 0, color: '#64748b' }}>
            Click an out-of-stock red pin to generate a nearby transfer recommendation.
          </p>
        )}

        {suggestion && (
          <>
            <p style={{ margin: '0 0 18px', color: '#475569' }}>
              Suggested transfer for out-of-stock location:
            </p>

            <div style={{ display: 'grid', gap: '10px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              <div><strong>Product:</strong> Mixed inventory rebalance</div>
              <div><strong>From:</strong> {suggestion.fromStore}</div>
              <div><strong>To:</strong> {suggestion.toStore}</div>
              <div><strong>Suggested Units:</strong> {suggestion.units}</div>
              <div><strong>Distance:</strong> {suggestion.distanceKm.toFixed(1)} km</div>
              <div><strong>Source Available:</strong> {suggestion.sourceAvailable} units</div>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
        {suggestion ? (
          <>
            <button
              onClick={onClear}
              style={{
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#334155',
                borderRadius: '8px',
                padding: '9px 12px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
            <button
              onClick={onClear}
              style={{
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#fff',
                borderRadius: '8px',
                padding: '9px 12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Accept Suggestion
            </button>
          </>
        ) : (
          <button
            disabled
            style={{
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '9px 12px',
              cursor: 'not-allowed',
              fontWeight: 600,
            }}
          >
            Accept Suggestion
          </button>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  padding: '24px',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  maxWidth: '1000px',
  margin: '0 auto',
  scrollbarGutter: 'stable', 
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '12px',
};

const splitStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
  gap: '20px',
  alignItems: 'start',
  marginBottom: '28px',
};

const storeListPanelStyle = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 6px 24px rgba(15,23,42,0.08)',
  padding: '14px',
  maxHeight: '640px',
  overflowY: 'auto',
  border: '1px solid #e2e8f0',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#fff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 6px 24px rgba(15,23,42,0.08)',
};

const thStyle = {
  backgroundColor: '#f3f4f6',
  color: '#111827',
  textAlign: 'left',
  fontSize: '14px',
  padding: '12px 14px',
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle = { padding: '12px 14px', borderBottom: '1px solid #f1f5f9' };

function StoreCard({ store, selected, onClick }) {
  const needsAttention = Boolean(store.needsAttention);
  const [showAttentionText, setShowAttentionText] = useState(false);
  return (
    <div
      onClick={onClick}
      style={{
        padding: '20px',
        borderRadius: '12px',
        border: selected ? '2px solid #3b82f6' : needsAttention ? '2px solid #fca5a5' : '2px solid transparent',
        backgroundColor: selected ? '#eff6ff' : '#fff',
        boxShadow: '0 2px 12px rgba(15,23,42,0.07)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {needsAttention && (
        <span
          onMouseEnter={() => setShowAttentionText(true)}
          onMouseLeave={() => setShowAttentionText(false)}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '999px',
            border: '1px solid #fca5a5',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          {showAttentionText ? '⚠ Needs Attention' : '⚠'}
        </span>
      )}
      <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px', color: '#1e293b' }}>
        {store.name}
      </div>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
        {store.totalProducts} products
      </div>
      <div style={{ fontSize: '13px', color: needsAttention ? '#dc2626' : '#16a34a' }}>
        {store.totalAvailable} available
      </div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>
        {store.totalSold} sold
      </div>
    </div>
  );
}

export default function StoreInventoryPage() {
  const [allRows, setAllRows] = useState([]);
  const [storeMeta, setStoreMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [transferSuggestion, setTransferSuggestion] = useState(null);

  const [storeOrder, setStoreOrder] = useState([]);
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/inventory-stats?month=all'),
      fetch('http://localhost:5000/api/stores')
    ])
      .then(async ([inventoryResponse, storesResponse]) => {
        if (!inventoryResponse.ok) throw new Error('Failed to load inventory data');
        if (!storesResponse.ok) throw new Error('Failed to load store coordinates');

        const inventoryPayload = await inventoryResponse.json();
        const storesPayload = await storesResponse.json();

        const metaByName = {};
        storesPayload.forEach((store) => {
          metaByName[store.location] = {
            latitude: store.latitude,
            longitude: store.longitude,
          };
        });
        setStoreOrder(storesPayload.map(s => s.location));
        setAllRows(inventoryPayload.data || []);
        setStoreMeta(metaByName);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const stores = useMemo(() => {
    const map = {};
    allRows.forEach((row) => {
      if (!map[row.store_name]) {
        map[row.store_name] = {
          name: row.store_name,
          totalProducts: 0,
          totalAvailable: 0,
          totalSold: 0,
          latitude: storeMeta[row.store_name]?.latitude,
          longitude: storeMeta[row.store_name]?.longitude,
          productNames: new Set(),
          needsAttention: false,
        };
      }
      map[row.store_name].productNames.add(row.product_name);
      map[row.store_name].totalAvailable += row.available;
      map[row.store_name].totalSold += row.sold;
      if (Number(row.available) <= LOW_STOCK_THRESHOLD) {
        map[row.store_name].needsAttention = true;
      }
    });
    Object.values(map).forEach((store) => {
      store.totalProducts = store.productNames.size;
      delete store.productNames;
    });
    // Order stores by database order
    return storeOrder.map(name => map[name]).filter(Boolean);
  }, [allRows, storeMeta, storeOrder]);

  const storeProducts = useMemo(() => {
    if (!selectedStore) return [];
    const byProduct = {};

    allRows
      .filter((r) => r.store_name === selectedStore)
      .forEach((row) => {
        if (!byProduct[row.product_name]) {
          byProduct[row.product_name] = {
            product_name: row.product_name,
            available: 0,
            sold: 0,
            delivered: 0,
          };
        }

        byProduct[row.product_name].available += Number(row.available || 0);
        byProduct[row.product_name].sold += Number(row.sold || 0);
        byProduct[row.product_name].delivered += Number(row.delivered || 0);
      });

    return Object.values(byProduct).sort((a, b) => a.product_name.localeCompare(b.product_name));
  }, [allRows, selectedStore]);

  function handleStoreSelection(store) {
    const storeName = typeof store === 'string' ? store : store.name;
    setSelectedStore((prev) => (prev === storeName ? null : storeName));

    if (!store || typeof store === 'string') return;

    const needsAttention = Boolean(store.needsAttention);
    if (!needsAttention) return;

    const lat = Number(store.latitude);
    const lon = Number(store.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;

    const donorCandidates = stores.filter((candidate) => {
      if (candidate.name === store.name) return false;
      if (Number(candidate.totalAvailable) <= 0) return false;
      return !Number.isNaN(Number(candidate.latitude)) && !Number.isNaN(Number(candidate.longitude));
    });

    if (donorCandidates.length === 0) {
      setTransferSuggestion({
        fromStore: 'No nearby donor store available',
        toStore: store.name,
        units: 0,
        distanceKm: 0,
        sourceAvailable: 0,
      });
      return;
    }

    const targetCoords = { latitude: lat, longitude: lon };

    const rankedDonors = donorCandidates
      .map((candidate) => ({
        candidate,
        km: distanceKm(targetCoords, {
          latitude: Number(candidate.latitude),
          longitude: Number(candidate.longitude),
        }),
      }))
      .sort((a, b) => a.km - b.km);

    const best = rankedDonors[0];
    const estimatedNeed = Math.max(5, Math.round(Number(store.totalSold || 0) * 0.25));
    const suggestedUnits = Math.min(Number(best.candidate.totalAvailable), estimatedNeed);

    setTransferSuggestion({
      fromStore: best.candidate.name,
      toStore: store.name,
      units: suggestedUnits,
      distanceKm: best.km,
      sourceAvailable: Number(best.candidate.totalAvailable),
    });
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '30px' }}>Store Inventory</h1>
      <p style={{ margin: 0, color: '#4b5563', marginBottom: '24px' }}>
        Select a store on the map or click a card to view its full product breakdown.
      </p>

      {loading && <p style={{ marginTop: '24px' }}>Loading stores...</p>}
      {error && !loading && <p style={{ color: '#dc2626', marginTop: '24px' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={splitStyle}>
            <div style={{ minWidth: 0 }}>
              <StoreMap
                stores={stores}
                onStoreSelect={handleStoreSelection}
                selectedStoreName={selectedStore}
              />
              <TransferSuggestionPanel
                suggestion={transferSuggestion}
                onClear={() => setTransferSuggestion(null)}
              />
            </div>

            <div style={{ ...storeListPanelStyle, minWidth: 0 }}>
              <h3 style={{ margin: '4px 4px 12px', color: '#1e293b' }}>Stores</h3>
              <div style={gridStyle}>
                {stores.map((store) => (
                  <StoreCard
                    key={store.name}
                    store={store}
                    selected={selectedStore === store.name}
                    onClick={() => handleStoreSelection(store)}
                  />
                ))}
              </div>
            </div>
          </div>

          {selectedStore && (
            <>
              <h2 style={{ marginBottom: '16px', color: '#1e293b' }}>{selectedStore}</h2>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Product</th>
                    <th style={thStyle}>Available</th>
                    <th style={thStyle}>Sold</th>
                    <th style={thStyle}>Delivered</th>
                    <th style={thStyle}>Sell-Through Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {storeProducts.map((row) => {
                    const str = row.delivered > 0 ? Math.round((row.sold / row.delivered) * 100) : 0;
                    const barColor = str >= 80 ? '#16a34a' : str >= 50 ? '#f59e0b' : '#dc2626';
                    const lowStock = row.available <= LOW_STOCK_THRESHOLD;
                    return (
                      <tr key={row.product_name}>
                        <td style={{ ...tdStyle, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {row.product_name}
                          {lowStock && (
                            <span style={{
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '999px',
                              border: '1px solid #fca5a5',
                              letterSpacing: '0.3px',
                              marginLeft: '4px',
                            }}>
                              ⚠ Needs Attention
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>{row.available}</td>
                        <td style={tdStyle}>{row.sold}</td>
                        <td style={tdStyle}>{row.delivered}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${str}%`, height: '100%', backgroundColor: barColor, borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', minWidth: '36px' }}>{str}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  );
}
