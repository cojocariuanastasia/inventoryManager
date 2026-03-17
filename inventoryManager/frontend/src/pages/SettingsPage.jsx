import React, { useEffect, useState, useMemo } from 'react';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const [tab, setTab] = useState('prices');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [newPrices, setNewPrices] = useState({});
  const [saving, setSaving] = useState(null);
  const [notification, setNotification] = useState(null);
  const [costPerMile, setCostPerMile] = useState(2.5);
  const [newCostPerMile, setNewCostPerMile] = useState('');

  function showNotification(message, type) {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetch('http://localhost:5000/api/products').then(r => {
        if (!r.ok) throw new Error('Failed to load products');
        return r.json();
      }),
      fetch('http://localhost:5000/api/settings/cost-per-mile').then(r => {
        if (!r.ok) throw new Error('Failed to load cost per mile');
        return r.json();
      }),
    ])
      .then(([prods, cpmData]) => {
        setProducts(prods);
        setCostPerMile(cpmData.cost_per_mile || 2.5);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      (p.product_name || p.name || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  async function handleSavePrice(product) {
    const id = product.id_product || product.id;
    const price = parseFloat(newPrices[id]);
    if (isNaN(price) || price < 0) {
      showNotification('Please enter a valid price', 'error');
      return;
    }
    setSaving(`price-${id}`);
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      });
      if (!res.ok) throw new Error('Failed to update price');
      setProducts(prev =>
        prev.map(p =>
          (p.id_product || p.id) === id ? { ...p, price } : p
        )
      );
      setNewPrices(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showNotification(`Price updated to $${price.toFixed(2)}`, 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveCostPerMile() {
    const value = parseFloat(newCostPerMile);
    if (isNaN(value) || value < 0) {
      showNotification('Please enter a valid cost per mile', 'error');
      return;
    }
    setSaving('cpm');
    try {
      const res = await fetch('http://localhost:5000/api/settings/cost-per-mile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost_per_mile: value }),
      });
      if (!res.ok) throw new Error('Failed to update cost per mile');
      setCostPerMile(value);
      setNewCostPerMile('');
      showNotification(`Cost per mile updated to $${value.toFixed(2)}`, 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Settings</h1>
      <p className={styles.subtitle}>
        Manage product prices and global transport settings.
      </p>

      {notification && (
        <div className={notification.type === 'success' ? styles.notificationSuccess : styles.notificationError}>
          {notification.message}
        </div>
      )}

      <div className={styles.tabBar}>
        <button
          className={tab === 'prices' ? styles.tabActive : styles.tab}
          onClick={() => { setTab('prices'); setSearch(''); }}
        >
          Product Prices ({products.length})
        </button>
        <button
          className={tab === 'general' ? styles.tabActive : styles.tab}
          onClick={() => { setTab('general'); setSearch(''); }}
        >
          General
        </button>
      </div>

      {tab === 'prices' && (
        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      )}

      {loading && <p className={styles.loadingText}>Loading data...</p>}
      {error && !loading && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && tab === 'prices' && (
        <>
          <div className={styles.summaryBar}>
            <span>{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredProducts.length === 0 ? (
            <p className={styles.emptyState}>
              {search ? 'No products match your search.' : 'No products found.'}
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Product Name</th>
                    <th className={styles.th}>Category</th>
                    <th className={styles.th}>Current Price</th>
                    <th className={styles.th}>New Price</th>
                    <th className={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => {
                    const id = p.id_product || p.id;
                    return (
                      <tr key={id}>
                        <td className={styles.nameCell}>{p.product_name || p.name}</td>
                        <td className={styles.categoryCell}>{p.category || '-'}</td>
                        <td className={styles.priceCell}>${Number(p.price).toFixed(2)}</td>
                        <td className={styles.td}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={Number(p.price).toFixed(2)}
                            value={newPrices[id] || ''}
                            onChange={(e) => setNewPrices(prev => ({ ...prev, [id]: e.target.value }))}
                            className={styles.priceInput}
                          />
                        </td>
                        <td className={styles.td}>
                          <button
                            onClick={() => handleSavePrice(p)}
                            className={styles.saveButton}
                            disabled={saving === `price-${id}` || !newPrices[id]}
                          >
                            {saving === `price-${id}` ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!loading && !error && tab === 'general' && (
        <div className={styles.generalSection}>
          <div className={styles.settingCard}>
            <div className={styles.settingInfo}>
              <h3 className={styles.settingTitle}>Cost Per Mile</h3>
              <p className={styles.settingDescription}>
                Base rate used to calculate transport costs between stores based on distance.
                This affects AI transfer recommendations and supply source cost estimates.
              </p>
              <div className={styles.settingCurrentValue}>
                Current: <strong>${costPerMile.toFixed(2)}</strong> / mile
              </div>
            </div>
            <div className={styles.settingControl}>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={costPerMile.toFixed(2)}
                value={newCostPerMile}
                onChange={(e) => setNewCostPerMile(e.target.value)}
                className={styles.priceInput}
              />
              <button
                onClick={handleSaveCostPerMile}
                className={styles.saveButton}
                disabled={saving === 'cpm' || !newCostPerMile}
              >
                {saving === 'cpm' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
