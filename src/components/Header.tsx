import React, { useState } from 'react';
import { Search, ShoppingCart, User, ChevronDown, PlaySquare, LogOut, Package, Users, ShieldCheck, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { auth } from '../lib/firebase';
import AuthModal from './AuthModal';

export default function Header() {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/category/${searchQuery.trim().toLowerCase()}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const openWhatsAppChat = () => {
    const message = encodeURIComponent("Hello! I have a question about your products.");
    window.open(`https://api.whatsapp.com/send?phone=918124623281&text=${message}`, '_blank');
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="text-2xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            NeuCommerce
          </Link>
          
          <div className="flex-1 max-w-2xl hidden md:flex items-center bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-700">
            <Search className="w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search for Products, Brands and More" 
              className="bg-transparent border-none outline-none text-white ml-2 w-full placeholder:text-zinc-500" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={openWhatsAppChat}
              className="hidden lg:flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors font-bold text-sm"
            >
              <MessageCircle className="w-5 h-5" />
              Chat with Us
            </button>

            <Link to="/c2m" className="hidden md:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 rounded-lg text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20">
              <PlaySquare className="w-4 h-4" />
              C2M Order
            </Link>

            <Link to="/clan" className="hidden md:flex items-center gap-2 text-zinc-300 hover:text-purple-400 transition-colors">
              <Users className="w-5 h-5" />
              <span className="font-medium">Clan</span>
            </Link>
            
            {/* Login Dropdown Trigger */}
            <div className="relative group">
              <button 
                onClick={() => !user && openAuth('login')}
                className="flex items-center gap-1 text-white hover:text-purple-400 transition-colors cursor-pointer"
              >
                <User className="w-5 h-5" />
                <span className="font-medium hidden sm:block">{user ? (user.displayName || 'Profile') : 'Login'}</span>
                <ChevronDown className="w-4 h-4 hidden sm:block" />
              </button>
              
              {/* Dropdown Menu (Hover) */}
              <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-4 z-[60]">
                {!user ? (
                  <>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800">
                      <span className="text-sm text-zinc-400">New customer?</span>
                      <button 
                        onClick={() => openAuth('signup')}
                        className="text-purple-400 font-bold text-sm hover:text-purple-300"
                      >
                        Sign Up
                      </button>
                    </div>
                    <ul className="space-y-3">
                      <li onClick={() => openAuth('login')} className="text-sm hover:text-purple-400 cursor-pointer flex items-center gap-3"><User className="w-4 h-4" /> My Profile</li>
                      <li onClick={() => openAuth('login')} className="text-sm hover:text-purple-400 cursor-pointer flex items-center gap-3"><PlaySquare className="w-4 h-4" /> My Order</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="mb-4 pb-4 border-b border-zinc-800">
                      <span className="text-sm font-bold text-white block truncate">{user.displayName || user.email}</span>
                      <span className="text-xs text-zinc-500 block truncate">{user.email}</span>
                    </div>
                    <ul className="space-y-3">
                      <Link to="/profile" className="text-sm hover:text-purple-400 cursor-pointer flex items-center gap-3"><User className="w-4 h-4" /> My Profile</Link>
                      <Link to="/profile" className="text-sm hover:text-purple-400 cursor-pointer flex items-center gap-3"><Package className="w-4 h-4" /> My Order</Link>
                      {user.email === 'yuvarajs.1511@gmail.com' && (
                        <Link to="/admin" className="text-sm hover:text-purple-400 cursor-pointer flex items-center gap-3"><ShieldCheck className="w-4 h-4" /> Admin Panel</Link>
                      )}
                      <li onClick={handleLogout} className="text-sm hover:text-red-400 cursor-pointer flex items-center gap-3 pt-3 border-t border-zinc-800"><LogOut className="w-4 h-4" /> Logout</li>
                    </ul>
                  </>
                )}
              </div>
            </div>

            <Link to="/cart" className="flex items-center gap-1 text-white hover:text-purple-400 transition-colors relative group/cart">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-black animate-in zoom-in duration-200">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="font-medium hidden sm:block">Cart</span>
            </Link>
          </div>
        </div>
        
        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-700">
            <Search className="w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search for Products..." 
              className="bg-transparent border-none outline-none text-white ml-2 w-full text-sm placeholder:text-zinc-500" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode} 
      />
    </>
  );
}
