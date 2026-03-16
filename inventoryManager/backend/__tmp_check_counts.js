const pool = require("./config/db");
pool.query("SELECT st.location AS store_name, COUNT(DISTINCT ms.id_product) AS product_count FROM monthly_stock ms JOIN stores st ON st.id_store=ms.id_store GROUP BY st.location ORDER BY st.location LIMIT 15;")
  .then((r) => { console.table(r.rows); return pool.end(); })
  .catch((e) => { console.error(e); pool.end(); });
