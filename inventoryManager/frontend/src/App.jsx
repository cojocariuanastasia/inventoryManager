import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import OverviewPage from './pages/TransferDashboard';
import AITransfersPage from './pages/AITransfersPage';
import StoreInventoryPage from './pages/StoreInventoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProductsPage from './pages/ProductsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/ai-transfers" element={<AITransfersPage />} />
        <Route path="/store-inventory" element={<StoreInventoryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
