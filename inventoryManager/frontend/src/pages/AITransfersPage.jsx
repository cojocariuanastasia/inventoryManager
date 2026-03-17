import React, { useEffect, useState, useMemo } from 'react';
import styles from './AITransfersPage.module.css';

export default function AITransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('recommendations');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('product');
  const [approving, setApproving] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [notification, setNotification] = useState(null);

  function showNotification(message, type) {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  function fetchRecommendations() {
    return fetch('http://localhost:5000/api/recommend-transfers')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load transfer recommendations');
        return r.json();
      });
  }

  function fetchApproved() {
    return fetch('http://localhost:5000/api/transfers/approved')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load approved transfers');
        return r.json();
      });
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetchRecommendations().catch(() => []),
      fetchApproved().catch(() => []),
    ])
      .then(([recs, apps]) => {
        setTransfers(recs);
        setApproved(apps);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const filteredTransfers = useMemo(() => {
    let list = [...transfers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.product.toLowerCase().includes(q) ||
        t.from.toLowerCase().includes(q) ||
        t.to.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'product') return a.product.localeCompare(b.product);
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      if (sortBy === 'cost') return b.transport_cost - a.transport_cost;
      return 0;
    });
    return list;
  }, [transfers, search, sortBy]);

  const filteredApproved = useMemo(() => {
    if (!search) return approved;
    const q = search.toLowerCase();
    return approved.filter(t =>
      t.product.toLowerCase().includes(q) ||
      t.from_store.toLowerCase().includes(q) ||
      t.to_store.toLowerCase().includes(q)
    );
  }, [approved, search]);

  async function handleApprove(index) {
    const t = filteredTransfers[index];
    setApproving(index);
    try {
      const res = await fetch('http://localhost:5000/api/transfers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: t.product,
          from: t.from,
          to: t.to,
          quantity: t.quantity,
          transport_cost: t.transport_cost,
        }),
      });
      if (!res.ok) throw new Error('Failed to approve transfer');
      const created = await res.json();
      setApproved(prev => [created, ...prev]);
      setTransfers(prev => prev.filter((_, i) => {
        const originalIndex = transfers.indexOf(filteredTransfers[index]);
        return i !== originalIndex;
      }));
      showNotification(`Approved: ${t.quantity}x ${t.product} to ${t.to}`, 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setApproving(null);
    }
  }

  async function handleApproveAll() {
    setApproving('all');
    try {
      for (let i = 0; i < transfers.length; i++) {
        const t = transfers[i];
        const res = await fetch('http://localhost:5000/api/transfers/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: t.product,
            from: t.from,
            to: t.to,
            quantity: t.quantity,
            transport_cost: t.transport_cost,
          }),
        });
        if (!res.ok) throw new Error(`Failed to approve transfer #${i + 1}`);
        const created = await res.json();
        setApproved(prev => [created, ...prev]);
      }
      setTransfers([]);
      showNotification('All transfers approved', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
      const [recs, apps] = await Promise.all([fetchRecommendations(), fetchApproved()]);
      setTransfers(recs);
      setApproved(apps);
    } finally {
      setApproving(null);
    }
  }

  async function handleCancel(id) {
    setCancelling(id);
    try {
      const res = await fetch(`http://localhost:5000/api/transfers/approved/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to cancel transfer');
      setApproved(prev => prev.filter(t => t.id !== id));
      const recs = await fetchRecommendations();
      setTransfers(recs);
      showNotification('Transfer cancelled and stock reversed', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setCancelling(null);
    }
  }

  const totalRecommendedCost = transfers.reduce((s, t) => s + Number(t.transport_cost || 0), 0);
  const totalApprovedCost = approved.reduce((s, t) => s + Number(t.transport_cost || 0), 0);
  const totalApprovedUnits = approved.reduce((s, t) => s + t.quantity, 0);

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>AI Transfer Recommendations</h1>
      <p className={styles.subtitle}>
        Smart inventory rebalancing suggestions based on sell-through rates and transport costs.
      </p>

      {notification && (
        <div className={notification.type === 'success' ? styles.notificationSuccess : styles.notificationError}>
          {notification.message}
        </div>
      )}

      <div className={styles.tabBar}>
        <button
          className={tab === 'recommendations' ? styles.tabActive : styles.tab}
          onClick={() => setTab('recommendations')}
        >
          Recommendations ({transfers.length})
        </button>
        <button
          className={tab === 'approved' ? styles.tabActive : styles.tab}
          onClick={() => setTab('approved')}
        >
          Approved ({approved.length})
        </button>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search product, store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        {tab === 'recommendations' && (
          <>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="product">Sort by Product</option>
              <option value="quantity">Sort by Quantity</option>
              <option value="cost">Sort by Cost</option>
            </select>
            {transfers.length > 0 && (
              <button
                className={styles.approveAllButton}
                onClick={handleApproveAll}
                disabled={approving === 'all'}
              >
                {approving === 'all' ? 'Approving...' : `Approve All (${transfers.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {loading && <p>Calculating optimal transfer routes...</p>}
      {error && !loading && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && tab === 'recommendations' && (
        <>
          <div className={styles.summaryBar}>
            <span>{filteredTransfers.length} recommendation{filteredTransfers.length !== 1 ? 's' : ''}</span>
            <span>Est. total transport cost: <strong>${totalRecommendedCost}</strong></span>
          </div>

          {filteredTransfers.length === 0 ? (
            <p className={styles.emptyState}>
              {search ? 'No recommendations match your search.' : 'No transfers needed. Inventory is balanced across all stores.'}
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Product</th>
                  <th className={styles.th}>From</th>
                  <th className={styles.th}>To</th>
                  <th className={styles.th}>Qty</th>
                  <th className={styles.th}>Unit Price</th>
                  <th className={styles.th}>Shipment Value</th>
                  <th className={styles.th}>Distance</th>
                  <th className={styles.th}>Transport Cost</th>
                  <th className={styles.th}>Verdict</th>
                  <th className={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((t, i) => (
                  <tr key={`${t.product}-${t.from}-${t.to}-${i}`} className={!t.worth_it ? styles.rowNotWorth : undefined}>
                    <td className={styles.productCell}>{t.product}</td>
                    <td className={styles.fromCell}>{t.from}</td>
                    <td className={styles.toCell}>{t.to}</td>
                    <td className={styles.td}>{t.quantity}</td>
                    <td className={styles.td}>${t.product_price}</td>
                    <td className={styles.td}>${t.shipment_value}</td>
                    <td className={styles.td}>{t.distance_miles ? `${t.distance_miles} mi` : '-'}</td>
                    <td className={styles.transportCostCell}>${t.transport_cost}</td>
                    <td className={styles.td}>
                      {t.worth_it ? (
                        <span className={styles.worthBadge}>Worth it</span>
                      ) : (
                        <span className={styles.notWorthBadge}>Not worth it</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <button
                        onClick={() => handleApprove(i)}
                        className={styles.approveButton}
                        disabled={approving === i}
                      >
                        {approving === i ? 'Approving...' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {!loading && !error && tab === 'approved' && (
        <>
          <div className={styles.summaryBar}>
            <span>{filteredApproved.length} approved transfer{filteredApproved.length !== 1 ? 's' : ''}</span>
            <span>{totalApprovedUnits} units moved | Total cost: <strong>${totalApprovedCost}</strong></span>
          </div>

          {filteredApproved.length === 0 ? (
            <p className={styles.emptyState}>
              {search ? 'No approved transfers match your search.' : 'No transfers approved yet. Go to Recommendations to approve some.'}
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Product</th>
                  <th className={styles.th}>From</th>
                  <th className={styles.th}>To</th>
                  <th className={styles.th}>Quantity</th>
                  <th className={styles.th}>Transport Cost</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Approved At</th>
                  <th className={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApproved.map((t) => (
                  <tr key={t.id}>
                    <td className={styles.productCell}>{t.product}</td>
                    <td className={styles.fromCell}>{t.from_store}</td>
                    <td className={styles.toCell}>{t.to_store}</td>
                    <td className={styles.td}>{t.quantity} units</td>
                    <td className={styles.transportCostCell}>${t.transport_cost}</td>
                    <td className={styles.td}>
                      <span className={styles.statusBadge}>{t.status}</span>
                    </td>
                    <td className={styles.td}>
                      {new Date(t.approved_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className={styles.td}>
                      <button
                        onClick={() => handleCancel(t.id)}
                        className={styles.cancelButton}
                        disabled={cancelling === t.id}
                      >
                        {cancelling === t.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
