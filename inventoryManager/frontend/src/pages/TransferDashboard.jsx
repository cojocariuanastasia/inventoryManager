import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TransferDashboard.module.css';

function KpiCard({ label, value, color, icon }) {
  return (
    <div className={styles.kpiCard} style={{ borderLeft: `4px solid ${color}` }}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div>
        <div className={styles.kpiValue} style={{ color }}>{value}</div>
        <div className={styles.kpiLabel}>{label}</div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/inventory-stats?month=all').then(r => {
        if (!r.ok) throw new Error('Failed to load inventory data');
        return r.json();
      }),
      fetch('http://localhost:5000/api/transfers/approved').then(r => {
        if (!r.ok) throw new Error('Failed to load transfers');
        return r.json();
      }),
    ])
      .then(([inventoryPayload, transfersData]) => {
        setRows(inventoryPayload.data || []);
        setTransfers(transfersData || []);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const storeHealth = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (!map[row.store_name]) map[row.store_name] = { available: 0, sold: 0, delivered: 0, products: 0, outOfStock: 0 };
      const s = map[row.store_name];
      s.available += row.available;
      s.sold += row.sold;
      s.delivered += row.delivered;
      s.products += 1;
      if (row.available <= 0) s.outOfStock += 1;
    });
    return Object.entries(map).map(([name, d]) => ({
      name,
      ...d,
      str: d.delivered > 0 ? Math.round((d.sold / d.delivered) * 100) : 0,
    }));
  }, [rows]);

  const criticalStores = useMemo(() => {
    return storeHealth
      .filter(s => s.outOfStock > 0 || s.str >= 90)
      .sort((a, b) => b.outOfStock - a.outOfStock || b.str - a.str);
  }, [storeHealth]);

  const productHealth = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      if (!map[row.product_name]) map[row.product_name] = { available: 0, sold: 0, delivered: 0, storeCount: 0, outOfStockStores: 0, price: row.product_price || 0 };
      const p = map[row.product_name];
      p.available += row.available;
      p.sold += row.sold;
      p.delivered += row.delivered;
      p.storeCount += 1;
      if (row.available <= 0) p.outOfStockStores += 1;
    });
    return Object.entries(map).map(([name, d]) => ({
      name,
      ...d,
      str: d.delivered > 0 ? Math.round((d.sold / d.delivered) * 100) : 0,
    }));
  }, [rows]);

  const lowProducts = useMemo(() => {
    return productHealth
      .filter(p => p.available <= 3 || p.str >= 90)
      .sort((a, b) => a.available - b.available || b.str - a.str);
  }, [productHealth]);

  const recentTransfers = useMemo(() => {
    return transfers.slice(0, 8);
  }, [transfers]);

  const totals = useMemo(() => {
    const totalAvailable = rows.reduce((s, r) => s + r.available, 0);
    const totalSold = rows.reduce((s, r) => s + r.sold, 0);
    const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
    const productsOutOfStock = productHealth.filter(p => p.available <= 0).length;
    return {
      criticalCount: criticalStores.length,
      activeTransfers: transfers.filter(t => t.status === 'approved').length,
      productsOutOfStock,
      overallStr: totalDelivered > 0 ? Math.round((totalSold / totalDelivered) * 100) : 0,
      totalAvailable,
      totalStores: storeHealth.length,
    };
  }, [rows, productHealth, criticalStores, transfers, storeHealth]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
      </div>

      {loading && <p>Loading overview...</p>}
      {error && !loading && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && (
        <div className={styles.content}>
          <div className={styles.kpiGrid}>
            <KpiCard label="Stores Need Attention" value={totals.criticalCount} color="#f87171" icon="!" />
            <KpiCard label="Active Transfers" value={totals.activeTransfers} color="#60a5fa" icon="&harr;" />
            <KpiCard label="Products Out of Stock" value={totals.productsOutOfStock} color="#fbbf24" icon="0" />
            <KpiCard label="Overall Sell-Through" value={`${totals.overallStr}%`} color="#4ade80" icon="%" />
          </div>

          <div className={styles.panels}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Stores Needing Attention</h3>
                <button className={styles.viewAllBtn} onClick={() => navigate('/store-inventory')}>View All</button>
              </div>
              <div className={styles.panelScroll}>
                {criticalStores.length === 0 && <p className={styles.emptyText}>All stores healthy</p>}
                {criticalStores.map(s => (
                  <div key={s.name} className={styles.storeRow}>
                    <div className={styles.storeRowTop}>
                      <span className={styles.storeName}>{s.name}</span>
                      <span className={styles.strBadge} style={{
                        color: s.str >= 95 ? '#f87171' : s.str >= 75 ? '#fbbf24' : '#4ade80',
                        borderColor: s.str >= 95 ? 'rgba(248,113,113,0.3)' : s.str >= 75 ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)',
                        backgroundColor: s.str >= 95 ? 'rgba(248,113,113,0.1)' : s.str >= 75 ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)',
                      }}>{s.str}% STR</span>
                    </div>
                    <div className={styles.storeRowBottom}>
                      <span className={styles.mutedText}>{s.available} available</span>
                      <span className={styles.mutedText}>{s.outOfStock} out of stock</span>
                      <span className={styles.mutedText}>{s.sold} sold</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Products Running Low</h3>
                <button className={styles.viewAllBtn} onClick={() => navigate('/products')}>View All</button>
              </div>
              <div className={styles.panelScroll}>
                {lowProducts.length === 0 && <p className={styles.emptyText}>All products well stocked</p>}
                {lowProducts.map(p => (
                  <div key={p.name} className={styles.productRow}>
                    <div className={styles.productRowTop}>
                      <span className={styles.productName}>{p.name}</span>
                      {p.available <= 0 ? (
                        <span className={styles.outBadge}>OUT OF STOCK</span>
                      ) : p.available <= 3 ? (
                        <span className={styles.lowBadge}>LOW STOCK</span>
                      ) : (
                        <span className={styles.highStrBadge}>HIGH STR</span>
                      )}
                    </div>
                    <div className={styles.productRowBottom}>
                      <span className={styles.mutedText}>{p.available} units across {p.storeCount - p.outOfStockStores} stores</span>
                      <span className={styles.mutedText}>{p.str}% sell-through</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Recent Transfers</h3>
                <button className={styles.viewAllBtn} onClick={() => navigate('/ai-transfers')}>View All</button>
              </div>
              <div className={styles.panelScroll}>
                {recentTransfers.length === 0 && <p className={styles.emptyText}>No transfers yet</p>}
                {recentTransfers.map(t => (
                  <div key={t.id} className={styles.transferRow}>
                    <div className={styles.transferProduct}>{t.product}</div>
                    <div className={styles.transferRoute}>
                      <span className={styles.mutedText}>{t.from_store}</span>
                      <span className={styles.arrow}>&rarr;</span>
                      <span className={styles.mutedText}>{t.to_store}</span>
                    </div>
                    <div className={styles.transferMeta}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{t.quantity} units</span>
                      <span className={styles.mutedText}>${t.transport_cost}</span>
                      <span className={styles.statusBadge} style={{
                        color: t.status === 'approved' ? '#4ade80' : '#f87171',
                        borderColor: t.status === 'approved' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
                        backgroundColor: t.status === 'approved' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                      }}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
