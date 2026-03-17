# Inventory Manager

A full-stack inventory management dashboard for tracking product stock across multiple store locations. Includes an interactive map, real-time low-stock alerts, AI-powered transfer suggestions, and comprehensive analytics.

---

## Application Overview

InventoryMgr is designed to help retail networks optimize their inventory distribution across stores. It provides:
- **Real-time inventory visibility** across all store locations
- **AI-powered transfer recommendations** to rebalance stock and minimize transport costs
- **Geographic optimization** using Haversine distance calculations for accurate shipping costs
- **Atomic transactions** ensuring data consistency during transfers
- **Comprehensive analytics** with sell-through rate (STR) tracking and forecasting
- **Interactive maps & dashboards** for quick decision-making

---

## Features & Pages

### 1. **Overview (Dashboard/Transfer Dashboard)**
The landing page displaying key performance indicators (KPIs) and critical alerts:

- **KPI Cards** showing:
  - Number of stores needing attention (with low/out-of-stock items)
  - Count of active transfers in-flight
  - Products fully out of stock across the network
  - Overall sell-through rate (%) — calculated as (total units sold / total units delivered) × 100

- **Critical Stores Panel** — Real-time alerts for:
  - Stores with any out-of-stock products
  - Stores with high sell-through rate (≥90%) indicating strong demand

- **Low Products Panel** — Products requiring immediate attention:
  - Products with ≤3 units available across all stores
  - Products with STR ≥75% (running low) or ≥95% (critical)

- **Recent Transfers** — Last 8 approved transfers showing what inventory has been moved

### 2. **Store Inventory Page**
Interactive map and detailed store inventory management:

**Map Features:**
- Color-coded store pins (Red = low stock, Green = healthy inventory)
- Low-stock threshold: 3 units minimum per product
- Click any store to view its complete product breakdown

**Store Cards:**
- List view of all stores with real-time status indicators
- Status badges for:
  - "Needs Attention" — store has low-stock products
  - Sell-Through Rate progress (75% = running low, 95% = critical)
  - High STR threshold: marks products moving too fast relative to stock

**Supply Source Modal** (When addressing low-stock products):
- Finds nearby stores with that product in stock
- Shows:
  - Distance calculation (using Haversine formula for great-circle distance)
  - Available quantity at each store
  - Estimated transport cost = distance (miles) × cost-per-mile ($2.50 default)
- "Accept" button initiates transfer request
- Automatically locks quantity to prevent over-shipping

**Distance Calculation** (Haversine Formula):
```
distance_miles = 2 × R × arcsin(√(sin²(Δlat/2) + cos(lat₁)cos(lat₂)sin²(Δlon/2)))
where R = 3958.8 miles (Earth's radius), Δlat/Δlon = latitude/longitude differences
```

### 3. **Products Page**
Grid-based product catalog with global availability tracking:

**Product Card Display:**
- Product name, category, and price
- Total units available across all stores (summed inventory)
- "Out of stock" badge when total available = 0
- Search functionality by product name
- Month selector (filter by specific month or "All Months")

**Availability Modal** (Click "Check Availability in Store"):
- Per-store breakdown showing:
  - Store name
  - Available quantity at that store
  - Units sold (from monthly_stock)
  - Color-coded indicators (Green = in stock, Red = out of stock, Yellow = low)
- Helps identify which stores have the product vs. which need restocking

### 4. **AI Transfers Page**
Intelligent inventory rebalancing powered by AI algorithm:

**Two Tabs:**

**A. Recommendations Tab** — AI-generated transfer suggestions
- Algorithm identifies:
  - **Deficit stores** — stores with zero remaining stock, prioritized by highest sales
  - **Surplus stores** — stores with excess inventory, prioritized by lowest STR
  - Optimal matches based on STR proximity (±10% tolerance) and minimal transport cost

- **AI Matching Logic:**
  1. For each product with stock imbalance
  2. Match deficit stores (zero stock, high demand) with surplus stores (excess stock, low demand)
  3. Prioritize matches where: shipment value > transport cost (avoids unprofitable transfers)
  4. Update virtual inventory to avoid recommending the same stock twice

- **Recommendation Details:**
  - Source store, destination store, product, quantity
  - Expected transport cost (distance × $2.50/mile)
  - Sell-Through Rate (STR) proximity indicator
  - Search & sort by product name, quantity, or cost

- **Action Buttons:**
  - "Approve" — send single transfer to the approved queue
  - "Approve All" — batch approve all recommendations at once
  - Success/error notifications for each action

**B. Approved Transfers Tab** — Completed and in-flight transfers
- Shows all transfers already approved and waiting execution
- Action buttons:
  - "Cancel" — reverses the transfer and restores stock to original stores
  - "Complete" — marks transfer as finished (if execution tracking added)

### 5. **Analytics Page**
Comprehensive business intelligence and reporting:

**Four Bar Charts:**
1. **Units Sold by Product** (Blue) — Total sold across all stores, sorted descending
   - Identifies top-selling products and demand hotspots

2. **Available Inventory by Store** (Green) — Current stock at each location
   - Shows which stores are fully stocked vs. depleted

3. **Sell-Through Rate by Product (%)** (Yellow) — Calculated as (sold / delivered) × 100
   - STR = 0%: No sales / overstocked
   - STR = 50-75%: Normal demand
   - STR = 75-95%: High demand, running low
   - STR > 95%: Critical demand, severe shortage risk

4. **Transport Cost by Store ($)** (Purple) — Total shipping costs aggregated by store
   - Helps identify cost-optimization opportunities

**Statistics Cards:** Displays four key metrics:
- Total units sold (across entire network)
- Total available inventory (current stock)
- Total units delivered (from monthly_stock)
- Overall STR percentage (network-wide demand indicator)

**Filters** (Multi-select available):
- By month (or "All Months")
- By store
- By product

### 6. **Settings Page**
Configuration and customization of global parameters:

**Tab 1: Product Prices**
- Search products by name
- Edit individual product prices
- Save button to persist changes to database
- Used in value calculations for transfer profitability

**Tab 2: General Settings**
- **Cost per Mile** — Default: $2.50
  - Master setting controlling all transport cost calculations
  - Used in:
    - Supply source modal (Store Inventory Page)
    - AI transfer recommendations (AI Transfers Page)
    - Analytics transport cost by store
- Change this value to instantly recalculate all transfer costs across the application

---

## Tech Stack

| Layer      | Technology                          | Version |
|------------|-------------------------------------|---------|
| Frontend   | React, Vite, React Router v6        | 19.2.4  |
| Mapping    | Leaflet, React-Leaflet              | 1.9.4   |
| Backend    | Node.js, Express                    | 5.2.1   |
| Database   | PostgreSQL                          | v14+    |
| DB Client  | node-postgres (`pg`)                | 8.20.0  |
| Utilities  | dotenv, CORS                        |         |

---

## Requirements

### System
- **Node.js** v18 or later
- **npm** v9 or later
- **PostgreSQL** v14 or later (running locally or remotely)

### Database tables expected
| Table           | Description                          |
|-----------------|--------------------------------------|
| `stores`        | Store locations with lat/lon coords  |
| `products`      | Product catalogue                    |
| `monthly_stock` | Monthly received/sold per store+product |

---

## Environment Variables

Create a `.env` file inside `backend/`:

```env
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
PORT=5000
```

---

## Getting Started

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Start the backend server

```bash
cd backend
node server.js
```

The API will be available at `http://localhost:5000`.

### 4. Start the frontend dev server

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

---

## API Endpoints & Backend

### Core Database Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `stores` | Store locations and metadata | `id_store`, `location`, `latitude`, `longitude`, `transport_cost` |
| `products` | Product catalog | `id_product`, `name`, `category`, `price` |
| `stock` | **Current/real-time inventory** snapshot (one row per store+product) | `id_store`, `id_product`, `received_products`, `sold_products`, `estimated` |
| `monthly_stock` | Historical monthly data (multiple rows per store+product+month) | `id_store`, `id_product`, `month_year`, `received_products`, `sold_products` |
| `approved_transfers` | Audit log of all inventory transfers | `id`, `product`, `from_store`, `to_store`, `quantity`, `transport_cost`, `status`, `approved_at` |
| `app_settings` | Global application configuration | `key` (e.g., `cost_per_mile`), `value` |

### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stores` | Returns all store locations with coordinates and metadata |
| GET | `/api/inventory-stats?month=<YYYY-MM or 'all'>` | Aggregated inventory stats per store+product, filtered by month |
| GET | `/api/supply-sources?store=<name>&product=<name>` | Finds stores with product in stock, calculates distance & cost using Haversine formula |
| GET | `/api/recommend-transfers` | **AI algorithm**: Matches deficit stores (zero stock, high sales) with surplus stores (excess, low STR); recommends only if shipment value > transport cost |
| POST | `/api/transfers/approve` | Creates approved transfer entry; executes **atomic transaction**: INSERT transfer record → decrease from_store stock → increase to_store stock |
| GET | `/api/transfers/approved` | Lists all approved transfers (excludes cancelled ones) |
| DELETE | `/api/transfers/approved/:id` | Soft-delete (cancels transfer); reverses all stock changes atomically |
| GET | `/api/products` | Lists all products with prices |
| PUT | `/api/products/:id/price` | Updates product price in database |
| POST | `/api/sync-stock` | Syncs latest data from `monthly_stock` → `stock` (upsert) |
| GET | `/api/settings/cost-per-mile` | Retrieves current transport cost multiplier |
| PUT | `/api/settings/cost-per-mile` | Updates cost-per-mile (affects all future transfer cost calculations) |

### Key Implementation Details

**Atomic Transfer Transaction:**
```sql
BEGIN TRANSACTION;
  INSERT INTO approved_transfers (product, from_store, to_store, quantity, transport_cost, status)
  VALUES (...);
  UPDATE stock SET received_products = received_products - quantity 
    WHERE id_store = from_store AND id_product = product_id;
  UPDATE stock SET received_products = received_products + quantity 
    WHERE id_store = to_store AND id_product = product_id;
COMMIT; -- or ROLLBACK on error
```
This ensures inventory is never left in an inconsistent state (no risk of double-selling or losing stock).

**Haversine Distance Formula** (for cost calculation):
```javascript
const R = 3958.8; // Earth's radius in miles
const distance = 2 * R * Math.asin(
  Math.sqrt(
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  )
);
const transportCost = distance * costPerMile; // $2.50/mile default
```
Provides accurate great-circle distance between two geographic coordinates, eliminating road-network estimation errors.

**AI Transfer Algorithm:**
1. Group inventory by product across all stores
2. For each product:
   - Identify **deficit stores**: remaining stock = 0, sorted by highest monthly sales
   - Identify **surplus stores**: remaining > 0, sorted by lowest STR
3. For each deficit store requesting product:
   - Calculate distance to all surplus stores Haversine formula
   - Sort surplus stores by STR proximity (±10% match) then distance cost
   - Recommend transfer **only if** shipment value > transport cost
   - Update virtual inventory to avoid recommending same stock twice
4. Return sorted list of recommended transfers

**Month Detection** (Dynamic Column):
- Scans table schema for date-type columns (month, report_month, stat_month, recorded_at, created_at, date, stock_date)
- Auto-detects and formats found column as `YYYY-MM`
- Falls back to substring truncation if column is text
- Enables flexibility across different database schemas

---

## Project Structure

```
inventoryManager/
├── backend/
│   ├── config/db.js        # PostgreSQL connection pool and queries
│   ├── server.js           # Express API server with all endpoints
│   └── package.json        # Dependencies (express, pg, cors, dotenv)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NavBar.jsx              # Navigation bar with links to all pages
│   │   │   └── NavBar.module.css
│   │   ├── pages/
│   │   │   ├── TransferDashboard.jsx   # Landing page with KPIs & alerts
│   │   │   ├── StoreInventoryPage.jsx  # Map + store cards + supply source modal
│   │   │   ├── ProductsPage.jsx        # Product grid + availability modal
│   │   │   ├── AITransfersPage.jsx     # Recommendations + approved transfers
│   │   │   ├── AnalyticsPage.jsx       # 4 bar charts + statistics + filters
│   │   │   ├── SettingsPage.jsx        # Product prices + global settings
│   │   │   └── *.module.css
│   │   ├── App.jsx         # Route definitions
│   │   ├── main.jsx        # React entry point
│   │   └── index.css
│   ├── vite.config.js
│   ├── package.json        # Dependencies (React, Vite, Router, Leaflet)
│   └── README.md
├── .gitignore
├── inventory.sql           # Database schema setup
└── README.md
```

### Frontend Directory Structure Details

- **src/components/** — Reusable UI components (currently just NavBar)
- **src/pages/** — Full-page components mapped to routes
  - Each page is a self-contained feature with its own styling (*.module.css)
  - All pages make API calls to the backend
  - State managed via React hooks (useState, useEffect)

### Backend Architecture

- **config/db.js** — Exports a connection pool for PostgreSQL queries
  - All DB operations use parameterized queries to prevent SQL injection
  - Connection pool handles concurrent requests efficiently

- **server.js** — Express server with 11 main endpoints
  - Uses CORS middleware to allow frontend requests
  - Implements error handling and atomic transactions
  - All responses return JSON

---

## Key Architectural Decisions & Patterns

### 1. **Atomic Transactions for Data Consistency**
All transfers use database transactions to ensure stock is never left in an inconsistent state. If any step fails, the entire transaction is rolled back.
- **Why**: Prevents inventory errors (e.g., losing stock or double-selling)
- **Implementation**: PostgreSQL BEGIN/COMMIT/ROLLBACK

### 2. **Haversine Distance Calculation**
Instead of using road-network APIs (which are slow and expensive), distances are calculated using the Haversine formula for great-circle distance.
- **Why**: Fast, accurate, and cost-free; suitable for logistics optimization
- **Accuracy**: Within 1-2% of actual road distance for most locations
- **Used in**: Supply source modal, AI transfer recommendations, analytics

### 3. **AI Transfer Matching Algorithm**
The system intelligently matches deficit stores (zero stock) with surplus stores (excess stock) based on:
1. Sell-Through Rate (STR) proximity (±10% tolerance) — matches stores with similar demand
2. Transport cost (Haversine distance × $2.50/mile) — prioritizes closest suppliers
3. Profitability filter — only recommends if shipment value > transport cost

- **Why**: Minimizes transport costs while rebalancing inventory toward natural demand patterns
- **Benefit**: Automates decision-making and prevents unprofitable transfers

### 4. **Real-Time Stock + Historical Monthly Data**
The system maintains two complementary inventory views:
- **`stock` table** — Current snapshot (one row per store+product)
  - Used for real-time decisions (what's available NOW?)
  - Updated by transfers and syncs from monthly_stock

- **`monthly_stock` table** — Historical time-series data (multiple rows per store+product+month)
  - Used for trend analysis and STR calculations
  - Preserves audit trail of all received and sold quantities
  - Enables month-over-month comparison

- **Why**: Allows real-time decisions while maintaining historical context for analytics

### 5. **Soft Deletes with Stock Reversal**
When transfers are cancelled, the system:
1. Marks the transfer record with `status = 'cancelled'`
2. Reverses stock changes (restores inventory atomically)
3. Preserves audit trail (nothing is truly deleted)

- **Why**: Maintains data integrity and compliance audit trails

### 6. **Dynamic Month Column Detection**
The API automatically detects which column contains date information, making the system flexible across different database schemas.
- **Why**: Reduces brittleness when database structure varies

---

## Sell-Through Rate (STR) Explanation

**STR** is a key metric used throughout the application:

**Formula**: STR (%) = (Units Sold / Units Delivered) × 100

**Interpretation**:
- **0-50%**: Overstocked, slow-moving products
- **50-75%**: Healthy, balanced supply-demand
- **75-95%**: High demand, starting to deplete
- **>95%**: Critical shortage, severe demand exceeds stock

**Usage in the app**:
- **Dashboard**: Critical stores with STR ≥90% flagged as needing attention
- **Store Inventory**: High STR threshold (75% = running low, 95% = critical)
- **AI Transfers**: Prioritizes moves from low-STR (excess) to high-STR (deficit) stores
- **Analytics**: Helps identify which products are moving fastest

---

## Business Logic & Data Flows

### Flow 1: Handling Low-Stock in Store Inventory Page

1. **User navigates** to Store Inventory Page
2. **Map loads** with all stores (green = healthy, red = low-stock)
3. **User clicks** a red-pin store with low-stock product
4. **System calls** `/api/supply-sources?store=<name>&product=<name>`
5. **API returns** all stores with that product, with:
   - Distance calculated via Haversine formula
   - Transport cost = distance × $2.50/mile
   - Available quantity at each store
6. **User clicks** "Accept" on a supplier
7. **System calls** `POST /api/transfers/approve`
8. **API executes** atomic transaction:
   - INSERT into `approved_transfers`
   - UPDATE decrease supplier's `stock.received_products`
   - UPDATE increase recipient's `stock.received_products`
9. **Frontend** shows success notification, updates inventory display

### Flow 2: AI-Powered Recommendation & Batch Approval

1. **User navigates** to AI Transfers Page
2. **System calls** `/api/recommend-transfers`
3. **API algorithm**:
   - Scans all products for stock imbalances
   - For each deficit store (zero stock):
     - Finds surplus stores with that product
     - Ranks by STR proximity + distance cost
     - Recommends **only if** value > cost
   - Updates virtual inventory to avoid duplicate recommendations
4. **Page displays** recommendations sorted by store, cost, STR proximity
5. **User clicks** "Approve All"
6. **System calls** `POST /api/transfers/approve` for each recommendation
7. **Each transfer** executes atomically
8. **Frontend** shows progress, success/error count

### Flow 3: Analytics & Reporting

1. **User navigates** to Analytics Page
2. **Page loads** default (all months, all stores, all products)
3. **System calls** `/api/inventory-stats?month=all`
4. **API queries** `monthly_stock` table and aggregates:
   - Units sold by product
   - Available inventory by store
   - Transport costs (calculated as distance × $2.50/mile)
   - STR = (sold / delivered) × 100
5. **Frontend** renders 4 bar charts + statistics cards
6. **User applies** filters (month, store, product)
7. **System re-queries** with filters
8. **Charts update** in real-time

---

## Requirements

### System
- **Node.js** v18 or later
- **npm** v9 or later
- **PostgreSQL** v14 or later (running locally or remotely)

### Database Setup
Required tables:
- `stores` — Store locations with lat/lon coordinates
- `products` — Product catalog
- `stock` — Current inventory (created automatically or via `sync-stock` endpoint)
- `monthly_stock` — Monthly historical data
- `approved_transfers` — Transfer audit log
- `app_settings` — Global configuration

See [inventory.sql](inventory.sql) for complete schema.

---

## Environment Variables

Create a `.env` file inside `backend/`:

```env
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
PORT=5000
```

---

## Getting Started

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Set up PostgreSQL database

- Create database (name matching DB_NAME in .env)
- Run schema from [inventory.sql](inventory.sql)
- Populate with stores, products, and monthly_stock data

### 4. Start the backend server

```bash
cd backend
node server.js
```

Backend API available at: **http://localhost:5000**

### 5. Start the frontend dev server (in separate terminal)

```bash
cd frontend
npm run dev
```

Frontend available at: **http://localhost:5173** (Vite default port)

---

## Testing the Application

### Quick Test Checklist

1. **Dashboard** — Should show KPIs with realistic numbers
2. **Store Inventory** — Map should display all stores with appropriate pin colors
3. **Products** — Grid should show all products with "Out of stock" badges where applicable
4. **AI Transfers** — Should generate recommendations for stores with zero stock
5. **Analytics** — Charts should render with actual data from database
6. **Settings** → Change cost-per-mile → Verify AI Transfers costs update

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot connect to database" | PostgreSQL not running or env vars incorrect | Check `.env` file, ensure PostgreSQL service is running |
| API returns "month column not found" | Database schema missing date column | Verify `monthly_stock` has a date column and populate with sample data |
| Map doesn't display | Leaflet not loading | Clear browser cache, check console for CORS errors |
| AI Transfers showing no recommendations | No deficit stores (all stores have stock) | Add sample stores with zero stock in `stock` table |
| Transfer fails with transaction error | Database connection pool exhausted | Restart backend, check for long-running queries |
