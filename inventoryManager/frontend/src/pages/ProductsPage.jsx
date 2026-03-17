import React, { useEffect, useMemo, useState } from 'react';
import styles from './ProductsPage.module.css';

function AvailabilityModal({ product, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{product.name}</h2>
          <button
            onClick={onClose}
            className={styles.modalCloseButton}
          >
            ×
          </button>
        </div>
        <table className={styles.modalTable}>
          <thead>
            <tr>
              <th className={styles.modalTh}>Store</th>
              <th className={styles.modalThCenter}>Available</th>
              <th className={styles.modalThCenter}>Sold</th>
            </tr>
          </thead>
          <tbody>
            {product.stores.map((s) => (
              <tr key={s.store}>
                <td className={styles.modalTd}>{s.store}</td>
                <td className={styles.modalTdCenter} style={{ fontWeight: 700, color: s.available > 0 ? '#4ade80' : '#f87171' }}>
                  {s.available}
                </td>
                <td className={styles.modalTdCenter}>{s.sold}</td>
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
    <div className={styles.productCard} style={{
      border: inStock ? '1px solid #2a2e3d' : '2px solid rgba(248,113,113,0.4)',
    }}>
      <div className={styles.productImagePlaceholder}>
        🛍️
      </div>

      <div className={styles.productCardBody}>
        <div className={styles.productName}>{product.name}</div>
        <div className={styles.productPrice}>${product.price}</div>
        <div style={{ fontSize: '13px', color: inStock ? '#4ade80' : '#f87171', fontWeight: 600 }}>
          {inStock ? `${totalAvailable} units available` : 'Out of stock'}
        </div>
        {!inStock && (
          <span className={styles.needsAttentionBadge}>
            ⚠ Needs Attention
          </span>
        )}

        <button
          onClick={() => onCheckAvailability(product)}
          className={styles.checkAvailabilityButton}
        >
          Check Availability in Store
        </button>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [allRows, setAllRows] = useState([]);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    fetch('http://localhost:5000/api/inventory-stats?month=all')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load products');
        return r.json();
      })
      .then((payload) => {
        setAllRows(payload.data || []);
        setMonths(payload.months || []);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const filteredRows = useMemo(() => {
    if (selectedMonth === 'all') return allRows;
    return allRows.filter(row => row.month === selectedMonth);
  }, [allRows, selectedMonth]);

  const products = useMemo(() => {
    const map = {};
    filteredRows.forEach((row) => {
      if (!map[row.product_name]) map[row.product_name] = { name: row.product_name, price: row.product_price || 0, stores: [] };
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
  }, [filteredRows, search]);

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Products</h1>
      <p className={styles.subtitle}>
        Browse products and check their availability across stores.
      </p>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          className={styles.monthSelect}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="all">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading && <p>Loading products...</p>}
      {error && !loading && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && products.length === 0 && <p>No products found.</p>}

      {!loading && !error && products.length > 0 && (
        <div className={styles.productGrid}>
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
