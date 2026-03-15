import React, { useEffect, useState } from 'react';

const pageStyle = {
  padding: '24px',
  fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  maxWidth: '1000px',
  margin: '0 auto',
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

export default function AITransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/recommend-transfers')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load transfer recommendations');
        return r.json();
      })
      .then((data) => { setTransfers(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const handleApprove = (index) => {
    alert(`Transfer approved: ${transfers[index].quantity}x ${transfers[index].product}`);
  };

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '8px' }}>AI Transfer Recommendations</h1>
      <p style={{ margin: '0 0 32px', color: '#4b5563' }}>
        Smart inventory rebalancing suggestions based on sell-through rates.
      </p>

      {loading && <p>Calculating optimal transfer routes...</p>}
      {error && !loading && <p style={{ color: '#dc2626' }}>{error}</p>}
      {!loading && !error && transfers.length === 0 && (
        <p>No transfers needed. Inventory is balanced across all stores.</p>
      )}

      {!loading && !error && transfers.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Move From (Surplus)</th>
              <th style={thStyle}>Move To (Deficit)</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{t.product}</td>
                <td style={{ ...tdStyle, color: '#dc2626' }}>{t.from}</td>
                <td style={{ ...tdStyle, color: '#16a34a' }}>{t.to}</td>
                <td style={tdStyle}>{t.quantity} units</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleApprove(i)}
                    style={{
                      padding: '7px 14px',
                      cursor: 'pointer',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
