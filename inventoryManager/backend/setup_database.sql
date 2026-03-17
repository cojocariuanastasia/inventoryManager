-- Create tables for inventory management
CREATE TABLE IF NOT EXISTS stores (
  id_store SERIAL PRIMARY KEY,
  location VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id_product SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS stock (
  id_store INT NOT NULL REFERENCES stores(id_store),
  id_product INT NOT NULL REFERENCES products(id_product),
  received_products INT DEFAULT 0,
  sold_products INT DEFAULT 0,
  estimated INT DEFAULT 0,
  PRIMARY KEY (id_store, id_product)
);

CREATE TABLE IF NOT EXISTS monthly_stock (
  id_store INT NOT NULL REFERENCES stores(id_store),
  id_product INT NOT NULL REFERENCES products(id_product),
  month_year DATE NOT NULL,
  received_products INT DEFAULT 0,
  sold_products INT DEFAULT 0,
  PRIMARY KEY (id_store, id_product, month_year)
);

-- Import data from CSV files
\COPY stores(id_store, location) FROM '../stores.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');
\COPY products(id_product, name, category) FROM '../products.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');
\COPY stock(id_store, id_product, received_products, sold_products, estimated) FROM '../stock.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');
\COPY monthly_stock(id_store, id_product, month_year, received_products, sold_products) FROM '../monthly_stock.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');
