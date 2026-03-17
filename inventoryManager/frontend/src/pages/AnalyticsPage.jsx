import React, { useEffect, useMemo, useState } from 'react';
import styles from './AnalyticsPage.module.css';

function StatCard({ label, value, color }) {
  return (
    <div className={styles.statCard} style={{ borderLeft: `4px solid ${color}` }}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color, title }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className={styles.chartArea}>
      <h3 className={styles.cardTitle}>{title}</h3>
      {data.length === 0 && <p className={styles.emptyChart}>No data for current filters.</p>}
      <div className={styles.chartScroll}>
        {data.map((d, i) => (
          <div key={i} className={styles.barRow}>
            <div className={styles.barLabelRow}>
              <span className={styles.barLabel}>{d[labelKey]}</span>
              <span className={styles.barValue}>{d[valueKey]}</span>
            </div>
            <div className={styles.barBackground}>
              <div className={styles.barFill} style={{
                width: `${(d[valueKey] / max) * 100}%`,
                backgroundColor: color,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHARTS = [
  { key: 'soldByProduct', title: 'Units Sold by Product', color: '#3b82f6' },
  { key: 'availableByStore', title: 'Available Inventory by Store', color: '#4ade80' },
  { key: 'strByProduct', title: 'Sell-Through Rate by Product (%)', color: '#fbbf24' },
  { key: 'transportByStore', title: 'Transport Cost by Store ($)', color: '#a78bfa' },
];

export default function AnalyticsPage() {
  const [allRows, setAllRows] = useState([]);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedChart, setSelectedChart] = useState('soldByProduct');

  useEffect(() => {
    fetch('http://localhost:5000/api/inventory-stats?month=all')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load analytics data');
        return r.json();
      })
      .then((payload) => {
        setAllRows(payload.data || []);
        setMonths(payload.months || []);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const storeNames = useMemo(() => {
    return [...new Set(allRows.map(r => r.store_name))].sort();
  }, [allRows]);

  const productNames = useMemo(() => {
    return [...new Set(allRows.map(r => r.product_name))].sort();
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      if (selectedMonth !== 'all' && row.month !== selectedMonth) return false;
      if (selectedStore !== 'all' && row.store_name !== selectedStore) return false;
      if (selectedProduct !== 'all' && row.product_name !== selectedProduct) return false;
      return true;
    });
  }, [allRows, selectedMonth, selectedStore, selectedProduct]);

  const chartData = useMemo(() => {
    const productMap = {};
    const storeMap = {};

    filteredRows.forEach((row) => {
      if (!productMap[row.product_name]) productMap[row.product_name] = { sold: 0, delivered: 0 };
      productMap[row.product_name].sold += row.sold;
      productMap[row.product_name].delivered += row.delivered;

      if (!storeMap[row.store_name]) storeMap[row.store_name] = { available: 0, sold: 0, transport_cost: row.transport_cost || 0 };
      storeMap[row.store_name].available += row.available;
      storeMap[row.store_name].sold += row.sold;
    });

    const soldByProduct = Object.entries(productMap)
      .map(([name, d]) => ({ label: name, value: d.sold }))
      .sort((a, b) => b.value - a.value);

    const availableByStore = Object.entries(storeMap)
      .map(([name, d]) => ({ label: name, value: d.available }))
      .sort((a, b) => b.value - a.value);

    const strByProduct = Object.entries(productMap)
      .map(([name, d]) => ({
        label: name,
        value: d.delivered > 0 ? Math.round((d.sold / d.delivered) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const transportByStore = Object.entries(storeMap)
      .map(([name, d]) => ({ label: name, value: Number(d.transport_cost) }))
      .sort((a, b) => b.value - a.value);

    const totalSold = filteredRows.reduce((s, r) => s + r.sold, 0);
    const totalAvailable = filteredRows.reduce((s, r) => s + r.available, 0);
    const totalDelivered = filteredRows.reduce((s, r) => s + r.delivered, 0);
    const overallStr = totalDelivered > 0 ? Math.round((totalSold / totalDelivered) * 100) : 0;

    return {
      soldByProduct,
      availableByStore,
      strByProduct,
      transportByStore,
      totals: { totalSold, totalAvailable, totalDelivered, overallStr },
    };
  }, [filteredRows]);

  const hasActiveFilters = selectedMonth !== 'all' || selectedStore !== 'all' || selectedProduct !== 'all';
  const activeChart = CHARTS.find(c => c.key === selectedChart) || CHARTS[0];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Month</label>
          <select
            className={styles.filterSelect}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Store</label>
          <select
            className={styles.filterSelect}
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="all">All Stores</option>
            {storeNames.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Product</label>
          <select
            className={styles.filterSelect}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="all">All Products</option>
            {productNames.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            className={styles.clearFilters}
            onClick={() => { setSelectedMonth('all'); setSelectedStore('all'); setSelectedProduct('all'); }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && <p>Loading analytics...</p>}
      {error && !loading && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && (
        <div className={styles.content}>
          <div className={styles.statsGrid}>
            <StatCard label="Total Units Sold" value={chartData.totals.totalSold} color="#3b82f6" />
            <StatCard label="Total Available" value={chartData.totals.totalAvailable} color="#4ade80" />
            <StatCard label="Total Delivered" value={chartData.totals.totalDelivered} color="#8b5cf6" />
            <StatCard label="Overall Sell-Through" value={`${chartData.totals.overallStr}%`} color="#fbbf24" />
          </div>

          <div className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <select
                className={styles.chartSelect}
                value={selectedChart}
                onChange={(e) => setSelectedChart(e.target.value)}
              >
                {CHARTS.map(c => (
                  <option key={c.key} value={c.key}>{c.title}</option>
                ))}
              </select>
            </div>

            <BarChart
              data={chartData[activeChart.key]}
              labelKey="label"
              valueKey="value"
              color={activeChart.color}
              title={activeChart.title}
            />
          </div>
        </div>
      )}
    </div>
  );
}
