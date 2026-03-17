const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

const STOCK_MONTH_CANDIDATES = [
  'month',
  'report_month',
  'stat_month',
  'recorded_at',
  'created_at',
  'date',
  'stock_date'
];

const quoteIdent = (value) => `"${value.replace(/"/g, '""')}"`;

async function getMonthExpression() {
  const columnsQuery = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock';
  `;
  const { rows } = await pool.query(columnsQuery);
  const byName = new Map(rows.map((row) => [row.column_name, row.data_type]));

  for (const column of STOCK_MONTH_CANDIDATES) {
    if (!byName.has(column)) continue;

    const colRef = `sk.${quoteIdent(column)}`;
    const dataType = byName.get(column);
    const isDateLike =
      dataType.includes('date') ||
      dataType.includes('timestamp') ||
      dataType.includes('time');

    if (isDateLike) {
      return `to_char(date_trunc('month', ${colRef}), 'YYYY-MM')`;
    }

    return `left(${colRef}::text, 7)`;
  }

  return null;
}


// A simple test route to get all stores
app.get('/api/stores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stores;');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// The AI Matchmaker Route
app.get('/api/recommend-transfers', async (req, res) => {
  try {
    // 1. Fetch cost per mile setting
    const settingsResult = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'cost_per_mile';`
    );
    const costPerMile = settingsResult.rows.length > 0 ? parseFloat(settingsResult.rows[0].value) : 2.50;

    // 2. Fetch the raw data joining stores and stock (include coordinates)
    const query = `
      SELECT st.location AS store_name, pr.name AS product_name,
             s.received_products AS delivered, s.sold_products AS sold,
             (s.received_products - s.sold_products) AS remaining,
             st.latitude, st.longitude,
             pr.price AS product_price
      FROM stock s
      JOIN stores st ON s.id_store = st.id_store
      JOIN products pr ON s.id_product = pr.id_product;
    `;
    const { rows } = await pool.query(query);

    // 3. Group the data by product so we don't mix up headphones with laptops
    const productsMap = {};
    rows.forEach(row => {
      if (!productsMap[row.product_name]) productsMap[row.product_name] = [];
      // Calculate Sell-Through Rate (STR)
      row.str = row.delivered > 0 ? (row.sold / row.delivered) : 0;
      productsMap[row.product_name].push(row);
    });

    const recommendedTransfers = [];

    // 4. The Algorithm: Match surplus to deficit
    for (const [productName, storesData] of Object.entries(productsMap)) {

      // Deficit stores: completely sold out. We prioritize stores that sold the most.
      const deficitStores = storesData
        .filter(s => s.remaining === 0)
        .sort((a, b) => b.sold - a.sold);

      // Surplus stores: have leftovers. We prioritize pulling from stores with the lowest STR.
      // Option A: When STR is similar (within 10%), use distance-based cost as tiebreaker.
      const surplusStores = storesData
        .filter(s => s.remaining > 0)
        .sort((a, b) => {
          const strDiff = a.str - b.str;
          if (Math.abs(strDiff) < 0.10) {
            // Use coordinates for cost comparison — compare to a "central" deficit store
            return 0; // Will be re-sorted per deficit store below
          }
          return strDiff;
        });

      // 5. Execute the virtual transfers
      for (let dStore of deficitStores) {
        let amountNeeded = dStore.sold; // Assume they need to restock what they sold out of

        const dLat = parseFloat(dStore.latitude);
        const dLon = parseFloat(dStore.longitude);

        // Re-sort surplus by STR with distance-based tiebreaker for this specific deficit store
        const sortedSurplus = [...surplusStores].sort((a, b) => {
          const strDiff = a.str - b.str;
          if (Math.abs(strDiff) < 0.10) {
            const distA = haversineDistanceMiles(dLat, dLon, parseFloat(a.latitude), parseFloat(a.longitude));
            const distB = haversineDistanceMiles(dLat, dLon, parseFloat(b.latitude), parseFloat(b.longitude));
            return distA - distB;
          }
          return strDiff;
        });

        for (let sStore of sortedSurplus) {
          if (amountNeeded === 0) break;
          if (sStore.remaining === 0) continue;

          const amountToMove = Math.min(amountNeeded, sStore.remaining);

          // Calculate distance-based transport cost
          const distMiles = haversineDistanceMiles(
            dLat, dLon,
            parseFloat(sStore.latitude), parseFloat(sStore.longitude)
          );
          const transportCost = Math.round(distMiles * costPerMile * 100) / 100;

          const productPrice = Number(dStore.product_price || 0);
          const shipmentValue = amountToMove * productPrice;
          const worthIt = shipmentValue > transportCost;

          recommendedTransfers.push({
            product: productName,
            from: sStore.store_name,
            to: dStore.store_name,
            quantity: amountToMove,
            transport_cost: transportCost,
            distance_miles: Math.round(distMiles),
            product_price: productPrice,
            shipment_value: Math.round(shipmentValue * 100) / 100,
            worth_it: worthIt
          });

          // Update virtual inventory for the next loop iteration
          sStore.remaining -= amountToMove;
          amountNeeded -= amountToMove;
        }
      }
    }

    res.json(recommendedTransfers);

  } catch (error) {
    console.error("AI processing error:", error);
    res.status(500).send("Server Error");
  }
});

app.get('/api/inventory-stats', async (req, res) => {
  try {
    const requestedMonth = req.query.month || 'all';
    const monthExpr = `to_char(date_trunc('month', ms.month_year::date), 'YYYY-MM')`;
    const queryParams = [];
    let whereClause = '';

    if (requestedMonth !== 'all') {
      queryParams.push(requestedMonth);
      whereClause = `WHERE ${monthExpr} = $1`;
    }

    const statsQuery = `
      SELECT
        st.location AS store_name,
        pr.name AS product_name,
        SUM(ms.received_products)::int AS delivered,
        SUM(ms.sold_products)::int AS sold,
        (SUM(ms.received_products) - SUM(ms.sold_products))::int AS available,
        ${monthExpr} AS month,
        st.transport_cost::float AS transport_cost,
        pr.price::float AS product_price
      FROM monthly_stock ms
      JOIN stores st ON ms.id_store = st.id_store
      JOIN products pr ON ms.id_product = pr.id_product
      ${whereClause}
      GROUP BY st.location, pr.name, ${monthExpr}, st.transport_cost, pr.price
      ORDER BY st.location ASC, pr.name ASC, month DESC;
    `;

    const statsResult = await pool.query(statsQuery, queryParams);
    const monthsResult = await pool.query(`
      SELECT DISTINCT ${monthExpr} AS month
      FROM monthly_stock ms
      WHERE ms.month_year IS NOT NULL
      ORDER BY month DESC;
    `);
    const months = monthsResult.rows
      .map((row) => row.month)
      .filter(Boolean);

    res.json({
      selectedMonth: requestedMonth,
      months,
      data: statsResult.rows
    });
  } catch (err) {
    console.error('Inventory stats error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory stats' });
  }
});

// ─── Approved Transfers endpoints ───────────────────────────────────────

// POST /api/transfers/approve
app.post('/api/transfers/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    const { product, from, to, quantity, transport_cost } = req.body;

    await client.query('BEGIN');

    // Insert the approved transfer
    const insertResult = await client.query(
      `INSERT INTO approved_transfers (product, from_store, to_store, quantity, transport_cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [product, from, to, quantity, transport_cost || 0]
    );

    // Decrease stock at the from_store
    await client.query(
      `UPDATE stock
       SET received_products = received_products - $1,
           estimated = received_products - $1 - sold_products
       WHERE id_store = (SELECT id_store FROM stores WHERE location = $2)
         AND id_product = (SELECT id_product FROM products WHERE name = $3);`,
      [quantity, from, product]
    );

    // Increase stock at the to_store
    await client.query(
      `UPDATE stock
       SET received_products = received_products + $1,
           estimated = received_products + $1 - sold_products
       WHERE id_store = (SELECT id_store FROM stores WHERE location = $2)
         AND id_product = (SELECT id_product FROM products WHERE name = $3);`,
      [quantity, to, product]
    );

    await client.query('COMMIT');
    res.json(insertResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve transfer error:', err);
    res.status(500).json({ error: 'Failed to approve transfer' });
  } finally {
    client.release();
  }
});

// GET /api/transfers/approved
app.get('/api/transfers/approved', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM approved_transfers
       WHERE status != 'cancelled'
       ORDER BY approved_at DESC;`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch approved transfers error:', err);
    res.status(500).json({ error: 'Failed to fetch approved transfers' });
  }
});

// DELETE /api/transfers/approved/:id  (soft delete + reverse stock)
app.delete('/api/transfers/approved/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Fetch the transfer so we know what to reverse
    const transferResult = await client.query(
      `SELECT * FROM approved_transfers WHERE id = $1;`,
      [id]
    );
    if (transferResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const transfer = transferResult.rows[0];
    if (transfer.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transfer already cancelled' });
    }

    // Soft-delete
    await client.query(
      `UPDATE approved_transfers SET status = 'cancelled' WHERE id = $1;`,
      [id]
    );

    // Reverse: add back to from_store
    await client.query(
      `UPDATE stock
       SET received_products = received_products + $1,
           estimated = received_products + $1 - sold_products
       WHERE id_store = (SELECT id_store FROM stores WHERE location = $2)
         AND id_product = (SELECT id_product FROM products WHERE name = $3);`,
      [transfer.quantity, transfer.from_store, transfer.product]
    );

    // Reverse: remove from to_store
    await client.query(
      `UPDATE stock
       SET received_products = received_products - $1,
           estimated = received_products - $1 - sold_products
       WHERE id_store = (SELECT id_store FROM stores WHERE location = $2)
         AND id_product = (SELECT id_product FROM products WHERE name = $3);`,
      [transfer.quantity, transfer.to_store, transfer.product]
    );

    await client.query('COMMIT');
    res.json({ message: 'Transfer cancelled and stock reversed' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel transfer error:', err);
    res.status(500).json({ error: 'Failed to cancel transfer' });
  } finally {
    client.release();
  }
});

// ─── Sync Stock endpoint ────────────────────────────────────────────────

// POST /api/sync-stock
app.post('/api/sync-stock', async (req, res) => {
  try {
    const upsertQuery = `
      WITH latest_month AS (
        SELECT MAX(to_char(date_trunc('month', ms.month_year::date), 'YYYY-MM')) AS m
        FROM monthly_stock ms
      ),
      aggregated AS (
        SELECT
          ms.id_store,
          ms.id_product,
          SUM(ms.received_products)::int AS total_received,
          SUM(ms.sold_products)::int AS total_sold
        FROM monthly_stock ms, latest_month lm
        WHERE to_char(date_trunc('month', ms.month_year::date), 'YYYY-MM') = lm.m
        GROUP BY ms.id_store, ms.id_product
      )
      INSERT INTO stock (id_store, id_product, received_products, sold_products, estimated)
      SELECT id_store, id_product, total_received, total_sold, total_received - total_sold
      FROM aggregated
      ON CONFLICT (id_store, id_product)
      DO UPDATE SET
        received_products = EXCLUDED.received_products,
        sold_products = EXCLUDED.sold_products,
        estimated = EXCLUDED.received_products - EXCLUDED.sold_products;
    `;

    const result = await pool.query(upsertQuery);
    res.json({ message: 'Stock synced', rowsUpdated: result.rowCount });
  } catch (err) {
    console.error('Sync stock error:', err);
    res.status(500).json({ error: 'Failed to sync stock' });
  }
});

// PUT /api/products/:id/price
app.put('/api/products/:id/price', async (req, res) => {
  try {
    const { price } = req.body;
    const result = await pool.query(
      'UPDATE products SET price = $1 WHERE id_product = $2 RETURNING *;',
      [price, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product price error:', err);
    res.status(500).json({ error: 'Failed to update product price' });
  }
});

// PUT /api/stores/:id/transport-cost
app.put('/api/stores/:id/transport-cost', async (req, res) => {
  try {
    const { transport_cost } = req.body;
    const result = await pool.query(
      'UPDATE stores SET transport_cost = $1 WHERE id_store = $2 RETURNING *;',
      [transport_cost, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update store transport cost error:', err);
    res.status(500).json({ error: 'Failed to update store transport cost' });
  }
});

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_product, name, category, price FROM products ORDER BY name;'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ─── App Settings endpoints ──────────────────────────────────────────

// GET /api/settings/cost-per-mile
app.get('/api/settings/cost-per-mile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'cost_per_mile';`
    );
    const value = result.rows.length > 0 ? parseFloat(result.rows[0].value) : 2.50;
    res.json({ cost_per_mile: value });
  } catch (err) {
    console.error('Fetch cost_per_mile error:', err);
    res.status(500).json({ error: 'Failed to fetch cost per mile' });
  }
});

// PUT /api/settings/cost-per-mile
app.put('/api/settings/cost-per-mile', async (req, res) => {
  try {
    const { cost_per_mile } = req.body;
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('cost_per_mile', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1;`,
      [String(cost_per_mile)]
    );
    res.json({ cost_per_mile: parseFloat(cost_per_mile) });
  } catch (err) {
    console.error('Update cost_per_mile error:', err);
    res.status(500).json({ error: 'Failed to update cost per mile' });
  }
});

// GET /api/supply-sources?store=<name>&product=<name>
// Returns other stores that have this product in stock, with distance and cost
app.get('/api/supply-sources', async (req, res) => {
  try {
    const { store, product } = req.query;
    if (!store || !product) {
      return res.status(400).json({ error: 'store and product are required' });
    }

    // Get cost per mile
    const settingsResult = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'cost_per_mile';`
    );
    const costPerMile = settingsResult.rows.length > 0 ? parseFloat(settingsResult.rows[0].value) : 2.50;

    // Get target store coordinates
    const targetResult = await pool.query(
      `SELECT id_store, location, latitude, longitude FROM stores WHERE location = $1;`,
      [store]
    );
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    const target = targetResult.rows[0];

    // Get all other stores that have this product with remaining > 0
    const sourcesResult = await pool.query(
      `SELECT st.location AS store_name, st.latitude, st.longitude,
              s.received_products - s.sold_products AS available
       FROM stock s
       JOIN stores st ON s.id_store = st.id_store
       JOIN products pr ON s.id_product = pr.id_product
       WHERE pr.name = $1
         AND st.location != $2
         AND (s.received_products - s.sold_products) > 0
       ORDER BY st.location;`,
      [product, store]
    );

    // Calculate distance and cost for each source
    const sources = sourcesResult.rows.map(row => {
      const distMiles = haversineDistanceMiles(
        parseFloat(target.latitude), parseFloat(target.longitude),
        parseFloat(row.latitude), parseFloat(row.longitude)
      );
      return {
        store_name: row.store_name,
        available: row.available,
        distance_miles: Math.round(distMiles),
        transport_cost: Math.round(distMiles * costPerMile * 100) / 100,
      };
    }).sort((a, b) => a.distance_miles - b.distance_miles);

    res.json({ sources, cost_per_mile: costPerMile });
  } catch (err) {
    console.error('Supply sources error:', err);
    res.status(500).json({ error: 'Failed to fetch supply sources' });
  }
});

// Haversine distance in miles
function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});