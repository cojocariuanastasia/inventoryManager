# Inventory Manager

A full-stack inventory management dashboard for tracking product stock across multiple store locations. Includes an interactive map, real-time low-stock alerts, and AI-powered transfer suggestions.

---

## Features

- **Store Inventory** — View all stores on an interactive map with color-coded pins. Red pins indicate one or more low-stock products. Click a store to see its full product breakdown.
- **Low-Stock Alerts** — Any product at or below the threshold triggers a "Needs Attention" badge on its store card and map pin.
- **Relocation Suggestions** — Selecting a low-stock store generates a nearest-donor transfer recommendation.
- **Products Page** — Browse all products across stores with availability and sell-through rate.
- **AI Transfer Page** — View AI-recommended transfers to rebalance inventory across the network.
- **Analytics Page** — Aggregated statistics and trends.
- **Transfer Dashboard** — Manage and track pending transfers.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Vite, React Router v6     |
| Map      | Leaflet, React-Leaflet              |
| Backend  | Node.js, Express 5                  |
| Database | PostgreSQL                          |
| ORM/DB   | node-postgres (`pg`)                |

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

## API Endpoints

| Method | Endpoint                          | Description                                 |
|--------|-----------------------------------|---------------------------------------------|
| GET    | `/api/stores`                     | All stores with coordinates                 |
| GET    | `/api/inventory-stats?month=all`  | Aggregated stock stats (filter by month)    |
| GET    | `/api/recommend-transfers`        | AI-generated transfer recommendations       |

---

## Project Structure

```
inventoryManager/
├── backend/
│   ├── config/db.js        # PostgreSQL connection pool
│   └── server.js           # Express API server
├── frontend/
│   └── src/
│       ├── components/
│       │   └── NavBar.jsx
│       └── pages/
│           ├── StoreInventoryPage.jsx
│           ├── ProductsPage.jsx
│           ├── AITransfersPage.jsx
│           ├── AnalyticsPage.jsx
│           ├── TransferDashboard.jsx
│           └── SettingsPage.jsx
├── .gitignore
└── README.md
```
