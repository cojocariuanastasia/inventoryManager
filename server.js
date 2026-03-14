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
    // 1. Fetch the raw data joining stores and stock
    const query = `
      SELECT st.name AS store_name, sk.product_name, sk.delivered, sk.sold, 
             (sk.delivered - sk.sold) AS remaining
      FROM stock sk
      JOIN stores st ON sk.store_id = st.id;
    `;
    const { rows } = await pool.query(query);

    // 2. Group the data by product so we don't mix up headphones with laptops
    const productsMap = {};
    rows.forEach(row => {
      if (!productsMap[row.product_name]) productsMap[row.product_name] = [];
      // Calculate Sell-Through Rate (STR)
      row.str = row.delivered > 0 ? (row.sold / row.delivered) : 0;
      productsMap[row.product_name].push(row);
    });

    const recommendedTransfers = [];

    // 3. The Algorithm: Match surplus to deficit
    for (const [productName, storesData] of Object.entries(productsMap)) {
      
      // Deficit stores: completely sold out. We prioritize stores that sold the most.
      const deficitStores = storesData
        .filter(s => s.remaining === 0)
        .sort((a, b) => b.sold - a.sold); 

      // Surplus stores: have leftovers. We prioritize pulling from stores with the lowest STR.
      const surplusStores = storesData
        .filter(s => s.remaining > 0)
        .sort((a, b) => a.str - b.str);

      // 4. Execute the virtual transfers
      for (let dStore of deficitStores) {
        let amountNeeded = dStore.sold; // Assume they need to restock what they sold out of

        for (let sStore of surplusStores) {
          if (amountNeeded === 0) break; // Deficit store is fully restocked
          if (sStore.remaining === 0) continue; // Surplus store is tapped out

          // Calculate how much to move
          const amountToMove = Math.min(amountNeeded, sStore.remaining);

          recommendedTransfers.push({
            product: productName,
            from: sStore.store_name,
            to: dStore.store_name,
            quantity: amountToMove
          });

          // Update virtual inventory for the next loop iteration
          sStore.remaining -= amountToMove;
          amountNeeded -= amountToMove;
        }
      }
    }

    // Send the final AI decisions to the React frontend
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
        ${monthExpr} AS month
      FROM monthly_stock ms
      JOIN stores st ON ms.id_store = st.id_store
      JOIN products pr ON ms.id_product = pr.id_product
      ${whereClause}
      GROUP BY st.location, pr.name, ${monthExpr}
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});