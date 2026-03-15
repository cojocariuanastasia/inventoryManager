import React, { useEffect, useMemo, useState } from 'react';

const pageStyle = {
  padding: '24px',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  maxWidth: '1100px',
  margin: '0 auto',
};

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15,23,42,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
};

const modalBox = {
  backgroundColor: '#fff',
  borderRadius: '14px',
  padding: '28px 32px',
  minWidth: '360px',
  maxWidth: '520px',
  width: '90%',
  boxShadow: '0 20px 60px rgba(15,23,42,0.18)',
};

const thStyle = {
  backgroundColor: '#f3f4f6',
  color: '#374151',
  textAlign: 'left',
  fontSize: '13px',
  padding: '10px 14px',
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };

function AvailabilityModal({ product, onClose }) {
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{product.name}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Store</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Available</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Sold</th>
            </tr>
          </thead>
          <tbody>
            {product.stores.map((s) => (
              <tr key={s.store}>
                <td style={tdStyle}>{s.store}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: s.available > 0 ? '#16a34a' : '#dc2626' }}>
                  {s.available}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{s.sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductCard({ product, onCheckAvailability }) {
  const totalAvailable = product.stores.reduce((s, st) => s + st.available, 0);
  const inStock = totalAvailable > 0;

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '14px',
      boxShadow: '0 4px 20px rgba(15,23,42,0.07)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      border: inStock ? 'none' : '2px solid #fca5a5',
      position: 'relative',
    }}>
      {/* Image placeholder */}
      <div style={{
        height: '160px',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontSize: '40px',
      }}>
        🛍️
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{product.name}</div>
        <div style={{ fontSize: '13px', color: inStock ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
          {inStock ? `${totalAvailable} units available` : 'Out of stock'}
        </div>
        {!inStock && (
          <span style={{
            alignSelf: 'flex-start',
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

        <button
          onClick={() => onCheckAvailability(product)}
          style={{
            marginTop: 'auto',
            padding: '9px 0',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.2px',
          }}
        >
          Check Availability in Store
        </button>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/inventory-stats?month=all')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load products');
        return r.json();
      })
      .then((payload) => { setAllRows(payload.data || []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const products = useMemo(() => {
    const map = {};
    allRows.forEach((row) => {
      if (!map[row.product_name]) map[row.product_name] = { name: row.product_name, stores: [] };
      map[row.product_name].stores.push({
        store: row.store_name,
        available: row.available,
        sold: row.sold,
        delivered: row.delivered,
      });
    });
    return Object.values(map)
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  }, [allRows, search]);

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '8px' }}>Products</h1>
      <p style={{ margin: '0 0 24px', color: '#4b5563' }}>
        Browse products and check their availability across stores.
      </p>

      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          padding: '8px 14px',
          fontSize: '14px',
          width: '280px',
          marginBottom: '28px',
          outline: 'none',
          fontFamily: 'Segoe UI, sans-serif',
        }}
      />

      {loading && <p>Loading products...</p>}
      {error && !loading && <p style={{ color: '#dc2626' }}>{error}</p>}
      {!loading && !error && products.length === 0 && <p>No products found.</p>}

      {!loading && !error && products.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
        }}>
          {products.map((product) => (
            <ProductCard
              key={product.name}
              product={product}
              onCheckAvailability={setSelectedProduct}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <AvailabilityModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

