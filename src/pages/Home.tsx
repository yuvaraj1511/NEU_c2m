import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { PlaySquare, ShoppingCart, Flame, Shirt, Baby, Sparkles, Star, X, CheckCircle2, MapPin, Plus, CreditCard, ShieldCheck, MessageCircle, RefreshCw, Package, Heart } from 'lucide-react';
import ProductDetailModal from '../components/ProductDetailModal';
import BannerCarousel from '../components/BannerCarousel';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface Product {
  _id: string;
  name: string;
  price: number;
  img: string;
  description: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  fabric: string;
  fit: string;
  features: string[];
  occasion: string;
  washCare: string;
  rating: number;
  reviewCount: number;
  c2m: boolean;
  isAd?: boolean;
  isBestseller?: boolean;
  brand?: string;
  discountPercentage?: number;
  mrp?: number;
  preOrderTarget?: number;
  currentPreOrders?: number;
  dealTag?: string;
  deliveryDate?: string;
  tags?: string[];
}

const POPULAR_PICKS: Product[] = [
  { 
    _id: "p1",
    name: "Classic Denim Jacket", 
    price: 2499, 
    img: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&q=80",
    description: "A timeless classic denim jacket. Durable, stylish, and perfect for layering.",
    sizes: ['M', 'L', 'XL'],
    colors: [{ name: 'Denim Blue', hex: '#1560BD' }],
    fabric: 'Heavyweight Denim Cotton',
    fit: 'Regular Fit',
    features: ['Metal Buttons', 'Chest Pockets', 'Adjustable Waist Tabs'],
    occasion: 'Casual / Outdoor',
    washCare: 'Machine Wash Cold',
    rating: 4.7,
    reviewCount: 320,
    c2m: false
  },
  { 
    _id: "p2",
    name: "Floral Summer Dress", 
    price: 1899, 
    img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80",
    description: "Breezy floral dress for summer days. Lightweight fabric with beautiful prints.",
    sizes: ['S', 'M', 'L'],
    colors: [{ name: 'Floral White', hex: '#F5F5F5' }],
    fabric: 'Rayon Blend',
    fit: 'A-Line Fit',
    features: ['V-Neck', 'Elasticated Waist', 'Flutter Sleeves'],
    occasion: 'Summer Outings',
    washCare: 'Hand Wash Cold',
    rating: 4.8,
    reviewCount: 215,
    c2m: false
  },
  { 
    _id: "p3",
    name: "Urban Streetwear Hoodie", 
    price: 1499, 
    img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80",
    description: "Comfortable urban hoodie for a modern look. Soft interior for maximum comfort.",
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Charcoal Gray', hex: '#333333' }],
    fabric: 'Cotton Fleece',
    fit: 'Relaxed Fit',
    features: ['Hood with Drawstrings', 'Kangaroo Pocket', 'Ribbed Hem'],
    occasion: 'Casual / Streetwear',
    washCare: 'Machine Wash Cold',
    rating: 4.6,
    reviewCount: 180,
    c2m: false
  },
  { 
    _id: "p4",
    name: "Kids Cotton T-Shirt", 
    price: 599, 
    img: "https://images.unsplash.com/photo-1519241047957-be31d7379a5d?w=500&q=80",
    description: "Soft cotton t-shirt for kids. Gentle on skin and durable for play.",
    sizes: ['2-3Y', '4-5Y', '6-7Y'],
    colors: [{ name: 'Bright Red', hex: '#FF0000' }],
    fabric: '100% Organic Cotton',
    fit: 'Regular Fit',
    features: ['Breathable', 'Soft Seams', 'Fun Graphics'],
    occasion: 'Playtime',
    washCare: 'Machine Wash Warm',
    rating: 4.9,
    reviewCount: 140,
    c2m: false
  },
];

export default function Home() {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'whatsapp'>('online');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const ADMIN_WHATSAPP_NUMBER = "918124623281"; // Replace with your actual WhatsApp number

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));
      console.log("Firestore Products:", products);
      setFirestoreProducts(products);
    }, (error) => {
      console.error("Home products snapshot error:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !showAddressPicker) return;

    const q = query(collection(db, `users/${user.uid}/addresses`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const addrData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAddresses(addrData);
      const defaultAddr = addrData.find((a: any) => a.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (addrData.length > 0) setSelectedAddressId(addrData[0].id);
    }, (error) => {
      console.error("Home addresses snapshot error:", error);
    });

    return () => unsubscribe();
  }, [user, showAddressPicker]);

  const allPopularPicks = React.useMemo(() => {
    return [...POPULAR_PICKS, ...firestoreProducts].sort(() => Math.random() - 0.5);
  }, [firestoreProducts]);

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleOrderClick = (size?: string, color?: string) => {
    if (!user) {
      alert("Please login to place an order.");
      return;
    }
    if (size) setSelectedSize(size);
    if (color) setSelectedColor(color);
    setShowAddressPicker(true);
  };

  const handleRazorpayPayment = async () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress || !selectedProduct) return;

    setIsOrdering(true);
    try {
      const response = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedProduct.price })
      });
      const order = await response.json();

      if (order.error) {
        throw new Error(order.error);
      }

      const options = {
        key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "NeuCommerce",
        description: "Order Payment",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/verify-razorpay-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();

            if (verifyData.status === 'success') {
              await addDoc(collection(db, 'orders'), {
                userId: user.uid,
                items: [{
                  id: selectedProduct._id,
                  name: selectedProduct.name,
                  price: selectedProduct.price,
                  quantity: 1,
                  size: selectedSize || undefined,
                  color: selectedColor || undefined,
                  sellerId: selectedProduct.sellerId || 'admin'
                }],
                sellerIds: [selectedProduct.sellerId || 'admin'],
                total: selectedProduct.price.toString(),
                status: 'processing',
                paymentMethod: 'online',
                paymentStatus: 'paid',
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                address: selectedAddress,
                createdAt: serverTimestamp()
              });

              setShowAddressPicker(false);
              setShowProductDetail(false);
              alert("Payment successful! Order placed.");
            } else {
              alert("Payment verification failed.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("Payment verification failed.");
          }
        },
        prefill: {
          name: selectedAddress.name,
          email: user.email,
          contact: selectedAddress.phone || ""
        },
        theme: {
          color: "#9333ea"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error(response.error);
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (error) {
      console.error("Razorpay error:", error);
      alert("Failed to initialize payment gateway. Please check if Razorpay keys are configured.");
    } finally {
      setIsOrdering(false);
    }
  };

  const processPaymentAndOrder = async () => {
    if (paymentMethod === 'online') {
      return handleRazorpayPayment();
    }

    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress || !selectedProduct) {
      alert("Please select or add an address first.");
      return;
    }

    setIsOrdering(true);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        items: [{
          id: selectedProduct._id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: 1,
          size: selectedSize || undefined,
          color: selectedColor || undefined,
          sellerId: selectedProduct.sellerId || 'admin'
        }],
        sellerIds: [selectedProduct.sellerId || 'admin'],
        total: selectedProduct.price.toString(),
        status: 'processing',
        paymentMethod: 'whatsapp',
        paymentStatus: 'whatsapp_pending',
        address: selectedAddress,
        createdAt: serverTimestamp()
      });

      setShowAddressPicker(false);
      setShowProductDetail(false);
      
      // Generate WhatsApp Message
      let message = `*New Order Request (ID: ${orderRef.id.slice(-8).toUpperCase()})*\n\n`;
      message += `*Items:*\n`;
      message += `- ${selectedProduct.name} (Qty: 1, Size: ${selectedSize || 'N/A'}, Color: ${selectedColor || 'N/A'}) - ₹${selectedProduct.price}\n`;
      message += `\n*Total Amount:* ₹${selectedProduct.price.toLocaleString('en-IN')}\n\n`;
      message += `*Delivery Address:*\n${selectedAddress.name}\n${selectedAddress.phone}\n${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.zip}\n\n`;
      message += `Please confirm my order and let me know how to pay.`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${ADMIN_WHATSAPP_NUMBER}&text=${encodedMessage}`;
      
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      alert("Order saved! Redirecting to WhatsApp to complete payment.");
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order.");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      <Header />
      
      {/* Categories */}
      <div className="bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-md mx-auto px-4 py-6 overflow-x-auto hide-scrollbar">
          <div className="flex gap-8 min-w-max justify-center md:justify-start">
            {[
              { icon: <Flame className="w-6 h-6" />, label: "Trending", path: "trending" },
              { icon: <Shirt className="w-6 h-6" />, label: "Men's", path: "mens" },
              { icon: <Sparkles className="w-6 h-6" />, label: "Women's", path: "womens" },
              { icon: <Baby className="w-6 h-6" />, label: "Kids", path: "kids" },
              { icon: <Star className="w-6 h-6" />, label: "New Arrivals", path: "new-arrivals" },
            ].map((cat, i) => (
              <Link to={`/category/${cat.path}`} key={i} className="flex flex-col items-center gap-3 cursor-pointer group">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 group-hover:border-purple-500 group-hover:bg-purple-500/10 transition-all">
                  <div className="text-zinc-300 group-hover:text-purple-400 transition-colors">
                    {cat.icon}
                  </div>
                </div>
                <span className="text-xs font-medium text-zinc-400 group-hover:text-white transition-colors">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* C2M Banner Carousel */}
      <BannerCarousel />

      {/* Standard Products Grid */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Popular Picks</h3>
          <button className="text-purple-400 hover:text-purple-300 font-medium text-sm">View All</button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {allPopularPicks.map((item, i) => (
            <div 
              key={item._id || i} 
              onClick={() => handleProductClick(item)}
              className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col"
            >
              <div className="aspect-[3/4] bg-zinc-800 rounded-xl mb-3 overflow-hidden relative">
                <img src={item.img || `https://picsum.photos/seed/${item._id}/300/400`} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                
                {/* Top Left Tags */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {item.isAd && (
                    <div className="bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-zinc-800 uppercase tracking-wider">
                      AD
                    </div>
                  )}
                  {item.isBestseller && (
                    <div className="bg-teal-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                      BESTSELLER
                    </div>
                  )}
                </div>

                {/* Top Right Heart */}
                <button 
                  onClick={(e) => { e.stopPropagation(); /* Add wishlist logic */ }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-md rounded-full text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                </button>

                {/* Bottom Left Rating */}
                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-800 flex items-center gap-1">
                  {item.rating || '3.7'} <Star className="w-3 h-3 fill-green-600 text-green-600" /> | {item.reviewCount ? (item.reviewCount > 1000 ? `${(item.reviewCount/1000).toFixed(1)}k` : item.reviewCount) : '82k'}
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                {/* Brand */}
                {item.brand && (
                  <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-wide mb-0.5">{item.brand}</h4>
                )}
                
                {/* Title */}
                <h4 className="font-medium mb-1 text-zinc-400 line-clamp-1 text-xs">{item.name}</h4>
                
                {/* Price Row */}
                <div className="flex items-center gap-2 mb-1">
                  {item.discountPercentage > 0 && (
                    <span className="text-green-500 font-bold text-sm">↓{item.discountPercentage}%</span>
                  )}
                  {item.mrp > 0 && (
                    <span className="text-zinc-500 line-through text-xs">₹{item.mrp.toLocaleString('en-IN')}</span>
                  )}
                  <span className="text-white font-bold text-base">₹{item.price.toLocaleString('en-IN')}</span>
                </div>

                {/* C2M Progress Bar */}
                {item.c2m && item.preOrderTarget > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-purple-400 font-bold">{item.currentPreOrders} Orders</span>
                      <span className="text-zinc-500">Goal: {item.preOrderTarget}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, (item.currentPreOrders / item.preOrderTarget) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Deal Tag */}
                {item.dealTag && (
                  <div className="mb-1">
                    <span className="bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {item.dealTag}
                    </span>
                  </div>
                )}

                {/* Delivery Date */}
                {item.deliveryDate && (
                  <p className="text-xs text-zinc-300 mt-auto pt-1">
                    Delivery by <span className="font-bold">{item.deliveryDate}</span>
                  </p>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="text-[10px] text-blue-400 font-medium">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct}
          isOpen={showProductDetail}
          onClose={() => setShowProductDetail(false)}
          onOrder={handleOrderClick}
        />
      )}

      {/* Address Picker & Payment Modal */}
      {showAddressPicker && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-20">
          <div className="bg-zinc-900 w-full max-w-md rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom duration-300 border-t border-zinc-800 max-h-[90vh] overflow-y-auto hide-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Secure Checkout</h3>
              <button onClick={() => setShowAddressPicker(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-3 mb-8">
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">1. Delivery Address</h4>
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-500 mb-4">No addresses found. Please add one in your profile.</p>
                  <button onClick={() => window.location.href = '/profile'} className="text-purple-400 font-bold flex items-center gap-2 mx-auto">
                    <Plus className="w-4 h-4" /> Go to Profile
                  </button>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div 
                    key={addr.id} 
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all",
                      selectedAddressId === addr.id ? "border-purple-500 bg-purple-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-zinc-200">{addr.name}</span>
                      {selectedAddressId === addr.id && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {addr.street}, {addr.city}, {addr.state} - {addr.zip}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">2. Payment Method</h4>
              <div className="space-y-3">
                <label 
                  onClick={() => setPaymentMethod('online')}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'online' ? "border-purple-500 bg-purple-500/10" : "border-zinc-800 hover:border-purple-500/50"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", paymentMethod === 'online' ? "border-purple-500" : "border-zinc-600")}>
                    {paymentMethod === 'online' && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}
                  </div>
                  <CreditCard className={cn("w-6 h-6", paymentMethod === 'online' ? "text-purple-400" : "text-zinc-500")} />
                  <div className="flex flex-col">
                    <span className={cn("font-bold", paymentMethod === 'online' ? "text-purple-300" : "text-zinc-300")}>Pay Online</span>
                    <span className="text-[10px] text-zinc-500">Credit/Debit Card, UPI, NetBanking</span>
                  </div>
                </label>

                <label 
                  onClick={() => setPaymentMethod('whatsapp')}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'whatsapp' ? "border-green-500 bg-green-900/20" : "border-zinc-800 hover:border-green-500/50"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", paymentMethod === 'whatsapp' ? "border-green-500" : "border-zinc-600")}>
                    {paymentMethod === 'whatsapp' && <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />}
                  </div>
                  <MessageCircle className={cn("w-6 h-6", paymentMethod === 'whatsapp' ? "text-green-500" : "text-zinc-500")} />
                  <div className="flex flex-col">
                    <span className={cn("font-bold", paymentMethod === 'whatsapp' ? "text-green-400" : "text-zinc-300")}>Share & Chat via WhatsApp</span>
                    <span className="text-[10px] text-zinc-500">Talk to us directly and pay securely</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex justify-between items-center px-2">
                <span className="text-zinc-400">Order Total</span>
                <span className="text-xl font-bold text-white">₹{selectedProduct?.price.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs mb-2">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span>Your order details are safe with us</span>
              </div>

              <button 
                onClick={processPaymentAndOrder}
                disabled={!selectedAddressId || isOrdering}
                className={cn(
                  "w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:grayscale",
                  paymentMethod === 'online' ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"
                )}
              >
                {isOrdering ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <>
                    {paymentMethod === 'online' ? 'Pay Online' : 'Share & Chat'} ₹{selectedProduct?.price.toLocaleString('en-IN')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
