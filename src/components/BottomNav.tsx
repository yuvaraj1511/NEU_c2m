import React, { useState } from 'react';
import { Home, Grid, ShoppingCart, User, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AuthModal from './AuthModal';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { totalItems } = useCart();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  return (
    <nav className="h-16 bg-zinc-950 border-t border-zinc-900 flex justify-around items-center px-2 pb-safe z-50 fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md">
      <Link to="/">
        <NavItem icon={<Home className="w-6 h-6" />} label="Home" active={location.pathname === '/'} />
      </Link>
      
      <Link to="/cart">
        <NavItem 
          icon={
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-black">
                  {totalItems}
                </span>
              )}
            </div>
          } 
          label="Cart" 
          active={location.pathname === '/cart'} 
        />
      </Link>
      
      {/* NeuPass / C2M Center Button */}
      <Link to="/c2m" className="relative -top-5 flex flex-col items-center">
        <div className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-black transition-transform hover:scale-105",
          location.pathname === '/c2m' 
            ? "bg-gradient-to-tr from-purple-600 to-pink-600 shadow-purple-500/50" 
            : "bg-zinc-800 shadow-none"
        )}>
          <span className="text-white font-bold text-xs tracking-wider">C2M</span>
        </div>
      </Link>

      <Link to="/clan">
        <NavItem icon={<Users className="w-6 h-6" />} label="Clan" active={location.pathname === '/clan'} />
      </Link>

      {user ? (
        <Link to="/profile">
          <NavItem icon={<User className="w-6 h-6" />} label="Profile" active={location.pathname === '/profile'} />
        </Link>
      ) : (
        <div onClick={() => setIsAuthModalOpen(true)} className="cursor-pointer">
          <NavItem icon={<User className="w-6 h-6" />} label="Login" />
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </nav>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 w-16 transition-colors",
      active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
    )}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}
