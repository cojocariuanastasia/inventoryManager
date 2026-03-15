import React, { useEffect, useMemo, useState } from 'react';

const pageStyle = {
  padding: '24px',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  maxWidth: '1000px',
  margin: '0 auto',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px',
  marginTop: '24px',
  marginBottom: '32px',
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
  const needsAttention = store.totalAvailable === 0;
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
        <span style={{
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
        }}>
          ⚠ Needs Attention
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/inventory-stats?month=all')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load inventory data');
        return r.json();
      })
      .then((payload) => { setAllRows(payload.data || []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const stores = useMemo(() => {
    const map = {};
    allRows.forEach((row) => {
      if (!map[row.store_name]) {
        map[row.store_name] = { name: row.store_name, totalProducts: 0, totalAvailable: 0, totalSold: 0 };
      }
      map[row.store_name].totalProducts++;
      map[row.store_name].totalAvailable += row.available;
      map[row.store_name].totalSold += row.sold;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows]);

  const storeProducts = useMemo(() => {
    if (!selectedStore) return [];
    return allRows
      .filter((r) => r.store_name === selectedStore)
      .sort((a, b) => a.product_name.localeCompare(b.product_name));
  }, [allRows, selectedStore]);

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '8px' }}>Store Inventory</h1>
      <p style={{ margin: 0, color: '#4b5563' }}>
        Select a store to view its full product breakdown.
      </p>

      {loading && <p style={{ marginTop: '24px' }}>Loading stores...</p>}
      {error && !loading && <p style={{ color: '#dc2626', marginTop: '24px' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={gridStyle}>
            {stores.map((store) => (
              <StoreCard
                key={store.name}
                store={store}
                selected={selectedStore === store.name}
                onClick={() => setSelectedStore(selectedStore === store.name ? null : store.name)}
              />
            ))}
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
                  {storeProducts.map((row, i) => {
                    const str = row.delivered > 0 ? Math.round((row.sold / row.delivered) * 100) : 0;
                    const barColor = str >= 80 ? '#16a34a' : str >= 50 ? '#f59e0b' : '#dc2626';
                    return (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{row.product_name}</td>
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
