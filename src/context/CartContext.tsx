import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, size: string, color: string) => void;
  updateQuantity: (id: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from Firestore or localStorage on mount/user change
  useEffect(() => {
    let isMounted = true;

    const loadCart = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().cart) {
            if (isMounted) setCart(docSnap.data().cart);
          } else {
            // Migrate guest cart if exists
            const localCart = localStorage.getItem('cart_guest');
            if (localCart) {
              const parsed = JSON.parse(localCart);
              if (isMounted) setCart(parsed);
              await setDoc(docRef, { cart: parsed }, { merge: true });
              localStorage.removeItem('cart_guest');
            } else {
              if (isMounted) setCart([]);
            }
          }
        } catch (error) {
          console.error("Error loading cart from Firestore:", error);
        }
      } else {
        const savedCart = localStorage.getItem('cart_guest');
        if (savedCart) {
          if (isMounted) setCart(JSON.parse(savedCart));
        } else {
          if (isMounted) setCart([]);
        }
      }
      if (isMounted) setIsInitialized(true);
    };

    loadCart();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Save cart to Firestore or localStorage on change
  useEffect(() => {
    if (!isInitialized) return;

    if (user) {
      setDoc(doc(db, 'users', user.uid), { cart }, { merge: true }).catch(console.error);
    } else {
      localStorage.setItem('cart_guest', JSON.stringify(cart));
    }
  }, [cart, user, isInitialized]);

  const addToCart = (newItem: CartItem) => {
    setCart(prev => {
      const existingItemIndex = prev.findIndex(item => 
        item.id === newItem.id && 
        item.size === newItem.size && 
        item.color === newItem.color
      );

      if (existingItemIndex > -1) {
        const updatedCart = [...prev];
        const newQty = updatedCart[existingItemIndex].quantity + newItem.quantity;
        updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: newQty };
        return updatedCart;
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (id: string, size: string, color: string) => {
    setCart(prev => prev.filter(item => !(item.id === id && item.size === size && item.color === color)));
  };

  const updateQuantity = (id: string, size: string, color: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => 
      (item.id === id && item.size === size && item.color === color) 
        ? { ...item, quantity } 
        : item
    ));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
