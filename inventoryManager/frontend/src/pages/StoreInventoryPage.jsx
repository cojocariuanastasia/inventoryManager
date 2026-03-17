import React, { useState, useEffect, useMemo } from 'react';
import styles from './StoreInventoryPage.module.css';

const LOW_STOCK_THRESHOLD = 3;
const HIGH_STR_THRESHOLD = 75;
const FIND_SUPPLY_STR = 95;

function SupplySourceModal({ productName, storeName, existingTransfers, onClose, onAccept }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [costPerMile, setCostPerMile] = useState(0);
  const [accepting, setAccepting] = useState(null);
  const [justAccepted, setJustAccepted] = useState({});

  // Build a set of from_store names that already have an approved transfer for this product+store
  const alreadyRequested = useMemo(() => {
    const set = {};
    existingTransfers.forEach(t => {
      if (t.product === productName && t.to_store === storeName && t.status !== 'cancelled') {
        set[t.from_store] = t.quantity;
      }
    });
    return set;
  }, [existingTransfers, productName, storeName]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/supply-sources?store=${encodeURIComponent(storeName)}&product=${encodeURIComponent(productName)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load supply sources');
        return r.json();
      })
      .then(data => {
        setSources(data.sources || []);
        setCostPerMile(data.cost_per_mile || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productName, storeName]);

  async function handleAccept(source) {
    const qty = Math.min(source.available, 10);
    setAccepting(source.store_name);
    try {
      const res = await fetch('http://localhost:5000/api/transfers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: productName,
          from: source.store_name,
          to: storeName,
          quantity: qty,
          transport_cost: source.transport_cost,
        }),
      });
      if (!res.ok) throw new Error('Failed to approve transfer');
      setJustAccepted(prev => ({ ...prev, [source.store_name]: qty }));
      if (onAccept) onAccept();
    } catch (err) {
      alert(err.message);
    } finally {
      setAccepting(null);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Supply Sources</h2>
            <p className={styles.modalSubtitle}>
              <span className={styles.modalProduct}>{productName}</span> for <strong>{storeName}</strong>
            </p>
          </div>
          <button onClick={onClose} className={styles.modalCloseButton}>×</button>
        </div>

        {loading && <p className={styles.modalLoading}>Finding nearby suppliers...</p>}

        {!loading && sources.length === 0 && (
          <p className={styles.modalEmpty}>No stores have this product in stock.</p>
        )}

        {!loading && sources.length > 0 && (
          <>
            <div className={styles.modalCostInfo}>
              Rate: ${costPerMile}/mile
            </div>
            <table className={styles.modalTable}>
              <thead>
                <tr>
                  <th className={styles.modalTh}>Store</th>
                  <th className={styles.modalThCenter}>Available</th>
                  <th className={styles.modalThCenter}>Distance</th>
                  <th className={styles.modalThCenter}>Est. Cost</th>
                  <th className={styles.modalThCenter}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => {
                  const prevRequested = alreadyRequested[s.store_name];
                  const thisSessionAccepted = justAccepted[s.store_name];

                  return (
                    <tr key={s.store_name}>
                      <td className={styles.modalTd}>
                        {s.store_name}
                        {i === 0 && <span className={styles.recommendedBadge}>Nearest</span>}
                      </td>
                      <td className={styles.modalTdCenter} style={{ fontWeight: 700, color: '#4ade80' }}>
                        {s.available}
                      </td>
                      <td className={styles.modalTdCenter}>
                        {s.distance_miles} mi
                      </td>
                      <td className={styles.modalTdCenter} style={{ color: '#a78bfa', fontWeight: 600 }}>
                        ${s.transport_cost.toFixed(2)}
                      </td>
                      <td className={styles.modalTdCenter}>
                        {prevRequested ? (
                          <span className={styles.requestedBadge}>Transfer Requested ({prevRequested})</span>
                        ) : thisSessionAccepted ? (
                          <span className={styles.acceptedBadge}>Transfer Requested ({thisSessionAccepted})</span>
                        ) : (
                          <button
                            className={styles.acceptSourceButton}
                            onClick={() => handleAccept(s)}
                            disabled={accepting !== null}
                          >
                            {accepting === s.store_name ? 'Approving...' : 'Accept'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function getStoreStatus(store, allRows) {
  const rows = allRows.filter(r => r.store_name === store.name);
  let hasCritical = false;
  let hasRunningLow = false;

  for (const row of rows) {
    const avail = Number(row.available);
    const delivered = Number(row.delivered || 0);
    const sold = Number(row.sold || 0);
    const str = delivered > 0 ? (sold / delivered) * 100 : 0;

    if (avail <= LOW_STOCK_THRESHOLD) {
      hasCritical = true;
    } else if (str >= HIGH_STR_THRESHOLD) {
      hasRunningLow = true;
    }
  }

  if (hasCritical) return 'critical';
  if (hasRunningLow) return 'low';
  return 'ok';
}

export default function StoreInventoryPage() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [supplyModal, setSupplyModal] = useState(null);
  const [filter, setFilter] = useState('all');
  const [approvedTransfers, setApprovedTransfers] = useState([]);

  const [storeOrder, setStoreOrder] = useState([]);
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/inventory-stats?month=all'),
      fetch('http://localhost:5000/api/stores'),
      fetch('http://localhost:5000/api/transfers/approved').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(async ([inventoryResponse, storesResponse, approved]) => {
        if (!inventoryResponse.ok) throw new Error('Failed to load inventory data');
        if (!storesResponse.ok) throw new Error('Failed to load store coordinates');

        const inventoryPayload = await inventoryResponse.json();
        const storesPayload = await storesResponse.json();

        setStoreOrder(storesPayload.map(s => s.location));
        setAllRows(inventoryPayload.data || []);
        setApprovedTransfers(approved);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Refresh approved transfers list after an accept
  function refreshApproved() {
    fetch('http://localhost:5000/api/transfers/approved')
      .then(r => r.ok ? r.json() : [])
      .then(setApprovedTransfers)
      .catch(() => {});
  }

  const stores = useMemo(() => {
    const map = {};
    allRows.forEach((row) => {
      if (!map[row.store_name]) {
        map[row.store_name] = {
          name: row.store_name,
          totalProducts: 0,
          totalAvailable: 0,
          totalSold: 0,
          totalDelivered: 0,
          productNames: new Set(),
          needsAttention: false,
        };
      }
      map[row.store_name].productNames.add(row.product_name);
      map[row.store_name].totalAvailable += row.available;
      map[row.store_name].totalSold += row.sold;
      map[row.store_name].totalDelivered += (row.delivered || 0);
      if (Number(row.available) <= LOW_STOCK_THRESHOLD) {
        map[row.store_name].needsAttention = true;
      }
    });
    Object.values(map).forEach((store) => {
      store.totalProducts = store.productNames.size;
      store.status = getStoreStatus(store, allRows);
      delete store.productNames;
    });
    return storeOrder.map(name => map[name]).filter(Boolean);
  }, [allRows, storeOrder]);

  const filteredStores = useMemo(() => {
    if (filter === 'all') return stores;
    return stores.filter(s => s.status === filter);
  }, [stores, filter]);

  const filterCounts = useMemo(() => {
    const counts = { all: stores.length, critical: 0, low: 0, ok: 0 };
    stores.forEach(s => { counts[s.status]++; });
    return counts;
  }, [stores]);

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

  function handleFindSupplyClick(productName, e) {
    e.stopPropagation();
    setSupplyModal({ product: productName, store: selectedStore });
  }

  const statusColor = { critical: '#f87171', low: '#fbbf24', ok: '#4ade80' };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Store Inventory</h1>
        <div className={styles.filterBar}>
          <button
            className={filter === 'all' ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setFilter('all')}
          >
            All ({filterCounts.all})
          </button>
          <button
            className={filter === 'critical' ? styles.filterBtnCriticalActive : styles.filterBtnCritical}
            onClick={() => setFilter('critical')}
          >
            Needs Attention ({filterCounts.critical})
          </button>
          <button
            className={filter === 'low' ? styles.filterBtnLowActive : styles.filterBtnLow}
            onClick={() => setFilter('low')}
          >
            Running Low ({filterCounts.low})
          </button>
          <button
            className={filter === 'ok' ? styles.filterBtnOkActive : styles.filterBtnOk}
            onClick={() => setFilter('ok')}
          >
            Stock OK ({filterCounts.ok})
          </button>
        </div>
      </div>

      {loading && <p className={styles.loadingText}>Loading stores...</p>}
      {error && !loading && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && (
        <div className={styles.mainLayout}>
          <div className={styles.storeListPanel}>
            {filteredStores.map((store) => {
              const isSelected = selectedStore === store.name;
              return (
                <div
                  key={store.name}
                  onClick={() => setSelectedStore(prev => prev === store.name ? null : store.name)}
                  className={isSelected ? styles.storeItemSelected : styles.storeItem}
                >
                  <div className={styles.storeItemTop}>
                    <span className={styles.storeName}>{store.name}</span>
                    <span className={styles.statusDot} style={{ color: statusColor[store.status] }}>
                      {store.status === 'critical' ? '⚠' : '●'}
                    </span>
                  </div>
                  <div className={styles.storeItemStats}>
                    <span style={{ color: statusColor[store.status] }}>
                      {store.totalAvailable} avail
                    </span>
                    <span className={styles.storeItemMuted}>{store.totalSold} sold</span>
                    <span className={styles.storeItemMuted}>{store.totalProducts} items</span>
                  </div>
                </div>
              );
            })}
            {filteredStores.length === 0 && (
              <div className={styles.emptyList}>No stores match this filter.</div>
            )}
          </div>

          <div className={styles.tablePanel}>
            {!selectedStore && (
              <div className={styles.emptyState}>
                Select a store from the list to view its products.
              </div>
            )}

            {selectedStore && (
              <>
                <h2 className={styles.selectedStoreHeading}>{selectedStore}</h2>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Product</th>
                        <th className={styles.th}>Available</th>
                        <th className={styles.th}>Sold</th>
                        <th className={styles.th}>Delivered</th>
                        <th className={styles.th}>Sell-Through Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeProducts.map((row) => {
                        const str = row.delivered > 0 ? Math.round((row.sold / row.delivered) * 100) : 0;
                        const barColor = str >= 80 ? '#4ade80' : str >= 50 ? '#fbbf24' : '#f87171';
                        const lowStock = row.available <= LOW_STOCK_THRESHOLD;
                        const highStr = str >= FIND_SUPPLY_STR;
                        const showFindSupply = lowStock || highStr;

                        return (
                          <tr key={row.product_name}>
                            <td className={styles.productNameCell}>
                              {row.product_name}
                              {showFindSupply && (
                                <span
                                  className={lowStock ? styles.lowStockBadge : styles.highStrBadge}
                                  onClick={(e) => handleFindSupplyClick(row.product_name, e)}
                                  title="Click to find supply sources"
                                >
                                  {lowStock ? '⚠ Find Supply' : '↗ Find Supply'}
                                </span>
                              )}
                            </td>
                            <td className={styles.td}>{row.available}</td>
                            <td className={styles.td}>{row.sold}</td>
                            <td className={styles.td}>{row.delivered}</td>
                            <td className={styles.td}>
                              <div className={styles.sellThroughWrapper}>
                                <div className={styles.sellThroughBarBackground}>
                                  <div className={styles.sellThroughBar} style={{ width: `${str}%`, backgroundColor: barColor }} />
                                </div>
                                <span className={styles.sellThroughValue}>{str}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {supplyModal && (
        <SupplySourceModal
          productName={supplyModal.product}
          storeName={supplyModal.store}
          existingTransfers={approvedTransfers}
          onClose={() => setSupplyModal(null)}
          onAccept={refreshApproved}
        />
      )}
    </div>
  );
}
