import React, { useEffect, useMemo, useState } from 'react';

const pageStyle = {
  padding: '24px',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  maxWidth: '1000px',
  margin: '0 auto'
};

const controlsStyle = {
  marginTop: '16px',
  marginBottom: '40px',
  display: 'flex',
  gap: '12px',
  alignItems: 'center'
};

const labelStyle = {
  fontWeight: 600,
  color: '#1f2937'
};

const selectStyle = {
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '8px 12px',
  minWidth: '180px'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 6px 24px rgba(15, 23, 42, 0.08)'
};

const thStyle = {
  backgroundColor: '#f3f4f6',
  color: '#111827',
  textAlign: 'left',
  fontSize: '14px',
  padding: '12px 14px',
  borderBottom: '1px solid #e5e7eb'
};

const tdStyle = {
  padding: '12px 14px',
  borderBottom: '1px solid #f1f5f9'
};

const numberStyle = {
  ...tdStyle,
  fontWeight: 600
};

const TransferDashboard = () => {
  const [rows, setRows] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [viewMode, setViewMode] = useState('stores');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInventoryStats = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `http://localhost:5000/api/inventory-stats?month=${encodeURIComponent(selectedMonth)}`
        );

        if (!response.ok) {
          throw new Error('Server returned an error while loading inventory stats');
        }

        const payload = await response.json();
        setRows(payload.data || []);
        setMonths(payload.months || []);
      } catch (err) {
        console.error('Failed to load inventory stats:', err);
        setError('Could not load inventory stats. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryStats();
  }, [selectedMonth]);

  const hasMonthData = useMemo(() => months.length > 0, [months]);
  const displayedRows = useMemo(() => {
    const sorted = [...rows];

    sorted.sort((a, b) => {
      const monthA = a.month || '';
      const monthB = b.month || '';

      if (viewMode === 'products') {
        return (
          a.product_name.localeCompare(b.product_name) ||
          a.store_name.localeCompare(b.store_name) ||
          monthB.localeCompare(monthA)
        );
      }

      return (
        a.store_name.localeCompare(b.store_name) ||
        a.product_name.localeCompare(b.product_name) ||
        monthB.localeCompare(monthA)
      );
    });

    return sorted;
  }, [rows, viewMode]);

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '20px' }}>Store Inventory Dashboard</h1>
      <p style={{ margin: 0, color: '#4b5563' }}>
        View each store&apos;s products, available quantity, and sold quantity.
      </p>

      <div style={controlsStyle}>
        <label style={labelStyle} htmlFor="month-select">
          Month:
        </label>
        <select
          id="month-select"
          style={selectStyle}
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          disabled={!hasMonthData}
        >
          <option value="all">All Months</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        {!hasMonthData && (
          <span style={{ color: '#6b7280', fontSize: '13px' }}>
            No month column found in stock table, showing all records.
          </span>
        )}

        <label style={labelStyle} htmlFor="view-select">
          View by:
        </label>
        <select
          id="view-select"
          style={selectStyle}
          value={viewMode}
          onChange={(event) => setViewMode(event.target.value)}
        >
          <option value="stores">Stores</option>
          <option value="products">Products</option>
        </select>
      </div>

      {loading && <h3>Loading inventory statistics...</h3>}
      {error && !loading && <p style={{ color: '#dc2626' }}>{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p>No inventory data found for this selection.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{viewMode === 'products' ? 'Product' : 'Store'}</th>
              <th style={thStyle}>{viewMode === 'products' ? 'Store' : 'Product'}</th>
              <th style={thStyle}>Available</th>
              <th style={thStyle}>Sold</th>
              <th style={thStyle}>Delivered</th>
              {hasMonthData && <th style={thStyle}>Month</th>}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row, index) => (
              <tr key={`${row.store_name}-${row.product_name}-${index}`}>
                <td style={tdStyle}>{viewMode === 'products' ? row.product_name : row.store_name}</td>
                <td style={tdStyle}>{viewMode === 'products' ? row.store_name : row.product_name}</td>
                <td style={numberStyle}>{row.available}</td>
                <td style={numberStyle}>{row.sold}</td>
                <td style={numberStyle}>{row.delivered}</td>
                {hasMonthData && <td style={tdStyle}>{row.month || '-'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TransferDashboard;