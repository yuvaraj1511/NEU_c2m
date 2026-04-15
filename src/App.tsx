import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import C2MPage from './pages/C2MPage';
import CategoryPage from './pages/CategoryPage';
import ProfilePage from './pages/ProfilePage';
import ClanPage from './pages/ClanPage';
import CartPage from './pages/CartPage';
import SellerDashboard from './pages/SellerDashboard';
import SellerPending from './pages/SellerPending';
import AdminPanel from './pages/AdminPanel';
import LegalPage from './pages/LegalPage';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-zinc-950 flex justify-center selection:bg-purple-500/30">
          <div className="w-full max-w-md bg-black min-h-screen relative shadow-2xl sm:border-x sm:border-zinc-800 overflow-x-hidden flex flex-col">
            <Router>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/c2m" element={<C2MPage />} />
                <Route path="/category/:categoryId" element={<CategoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/clan" element={<ClanPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/seller" element={<SellerDashboard />} />
                <Route path="/seller-pending" element={<SellerPending />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/legal/:pageId" element={<LegalPage />} />
              </Routes>
            </Router>
          </div>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
