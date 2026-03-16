import React, { useEffect, useMemo, useState } from 'react';

const pageStyle = {
  padding: '24px',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  maxWidth: '1000px',
  margin: '0 auto',
};

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 4px 20px rgba(15,23,42,0.07)',
  marginBottom: '24px',
};

function StatCard({ label, value, color }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 4px 20px rgba(15,23,42,0.07)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: '14px', color: '#374151', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color, title }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '16px' }}>{title}</h3>
      {data.map((d, i) => (
        <div key={i} style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{d[labelKey]}</span>
            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>{d[valueKey]}</span>
          </div>
          <div style={{ height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              width: `${(d[valueKey] / max) * 100}%`,
              height: '100%',
              backgroundColor: color,
              borderRadius: '5px',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/inventory-stats?month=all')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load analytics data');
        return r.json();
      })
      .then((payload) => { setAllRows(payload.data || []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const { soldByProduct, availableByStore, strByProduct, totals } = useMemo(() => {
    const productMap = {};
    const storeMap = {};

    allRows.forEach((row) => {
      if (!productMap[row.product_name]) productMap[row.product_name] = { sold: 0, delivered: 0 };
      productMap[row.product_name].sold += row.sold;
      productMap[row.product_name].delivered += row.delivered;

      if (!storeMap[row.store_name]) storeMap[row.store_name] = { available: 0, sold: 0 };
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

    const totalSold = allRows.reduce((s, r) => s + r.sold, 0);
    const totalAvailable = allRows.reduce((s, r) => s + r.available, 0);
    const totalDelivered = allRows.reduce((s, r) => s + r.delivered, 0);
    const overallStr = totalDelivered > 0 ? Math.round((totalSold / totalDelivered) * 100) : 0;

    return { soldByProduct, availableByStore, strByProduct, totals: { totalSold, totalAvailable, totalDelivered, overallStr } };
  }, [allRows]);

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '30px' }}>Analytics</h1>
      <p style={{ margin: '0 0 32px', color: '#4b5563' }}>
        Inventory performance metrics across all stores and products.
      </p>

      {loading && <p>Loading analytics...</p>}
      {error && !loading && <p style={{ color: '#dc2626' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}>
            <StatCard label="Total Units Sold" value={totals.totalSold} color="#3b82f6" />
            <StatCard label="Total Available" value={totals.totalAvailable} color="#16a34a" />
            <StatCard label="Total Delivered" value={totals.totalDelivered} color="#8b5cf6" />
            <StatCard label="Overall Sell-Through" value={`${totals.overallStr}%`} color="#f59e0b" />
          </div>

          <BarChart data={soldByProduct} labelKey="label" valueKey="value" color="#3b82f6" title="Units Sold by Product" />
          <BarChart data={availableByStore} labelKey="label" valueKey="value" color="#16a34a" title="Available Inventory by Store" />
          <BarChart data={strByProduct} labelKey="label" valueKey="value" color="#f59e0b" title="Sell-Through Rate by Product (%)" />
        </>
      )}
    </div>
  );
}
