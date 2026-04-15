import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Store, Package, ShoppingBag, BarChart3, Plus, Edit2, Trash2, 
  CheckCircle2, Clock, Truck, X, ChevronRight, Image as ImageIcon,
  AlertCircle, ArrowLeft, Star, ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';

import { motion, AnimatePresence } from 'motion/react';

interface SellerProfile {
  uid: string;
  shopName: string;
  shopDescription: string;
  shopLogo?: string;
  companyType?: 'Individual' | 'LLP' | 'Pvt Ltd';
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  gstNumber?: string;
  panNumber?: string;
  pickupAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    cancelledChequeUrl: string;
  };
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  commissionRate?: number;
  totalEarnings?: number;
  pendingPayouts?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  sellingPrice?: number;
  category: string;
  subCategory?: string;
  stock: number;
  img: string;
  images?: string[];
  status: 'live' | 'rejected' | 'pending';
  sku?: string;
  variants?: any[];
  highlights?: string[];
  brand?: string;
  discountPercentage?: number;
  deliveryDate?: string;
  tags?: string[];
  isAd?: boolean;
  isBestseller?: boolean;
  dealTag?: string;
  rating?: number;
  reviewCount?: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string) {
  console.error(`Firestore Error [${operationType}] on ${path}:`, error);
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('overview');
  
  // Modal states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // Form states
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<any>({
    shopName: '',
    shopDescription: '',
    companyType: 'Individual',
    phone: '',
    whatsappNumber: '',
    email: '',
    gstNumber: '',
    panNumber: '',
    pickupAddress: { street: '', city: '', state: '', zip: '' },
    bankDetails: { accountNumber: '', ifscCode: '', cancelledChequeUrl: '' }
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch Seller Profile
    const unsubSeller = onSnapshot(doc(db, 'sellers', user.uid), (doc) => {
      if (doc.exists()) {
        setSellerProfile(doc.data() as SellerProfile);
      } else {
        setSellerProfile(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `sellers/${user.uid}`);
      setLoading(false);
    });

    // Fetch Products (if seller)
    const qProducts = query(collection(db, 'products'), where('sellerId', '==', user.uid));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    // Fetch Orders (where user is a seller)
    const qOrders = query(collection(db, 'orders'), where('sellerIds', 'array-contains', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubSeller();
      unsubProducts();
      unsubOrders();
    };
  }, [user]);

  const handleApply = async () => {
    if (!user) return;

    try {
      await setDoc(doc(db, 'sellers', user.uid), {
        ...onboardingData,
        uid: user.uid,
        status: 'pending',
        commissionRate: 10,
        totalEarnings: 0,
        pendingPayouts: 0,
        createdAt: serverTimestamp()
      });
      setShowApplyModal(false);
      alert("Application submitted! Please wait for admin approval.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `sellers/${user.uid}`);
      alert("Failed to submit application.");
    }
  };

  const handleSaveProduct = async (productData: any) => {
    if (!user) return;
    console.log("Saving product:", productData);
    
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          updatedAt: serverTimestamp()
        });
      } else {
        console.log("Adding new product...");
        await addDoc(collection(db, 'products'), {
          ...productData,
          sellerId: user.uid,
          createdAt: serverTimestamp(),
          rating: 0,
          reviewCount: 0
        });
        console.log("Product added successfully.");
      }
      setShowProductModal(false);
      setEditingProduct(null);
      alert(editingProduct ? "Product updated successfully!" : "Product added successfully!");
    } catch (error) {
      console.error("Error saving product:", error);
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
      alert("Failed to save product. Check console for details.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    console.log("Attempting to delete product:", id);
    try {
      await deleteDoc(doc(db, 'products', id));
      console.log("Product deleted successfully from DB.");
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 3000);
    } catch (error) {
      console.error("Error deleting product:", error);
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      alert("Failed to delete product.");
    }
  };

  const [shippingData, setShippingData] = useState({
    awb: '',
    courier: 'India Post (Speed Post)',
    orderId: ''
  });
  const [showShippingModal, setShowShippingModal] = useState(false);

  const handleMarkAsShipped = async (orderId: string) => {
    setShippingData({ ...shippingData, orderId });
    setShowShippingModal(true);
  };

  const confirmShipping = async () => {
    if (!shippingData.awb) {
      alert("Please enter Consignment Number");
      return;
    }

    try {
      await updateDoc(doc(db, 'orders', shippingData.orderId), {
        status: 'shipped',
        awb: shippingData.awb,
        courier: shippingData.courier,
        shippedAt: serverTimestamp(),
        trackingUrl: `https://www.indiapost.gov.in/_layouts/15/dop.indiapost.tracking/trackconsignment.aspx`
      });
      
      // Simulate WhatsApp Notification
      const order = orders.find(o => o.id === shippingData.orderId);
      if (order?.address?.phone) {
        const message = encodeURIComponent(`Hi ${order.address.name}, your order #${shippingData.orderId.slice(-8).toUpperCase()} has been shipped via ${shippingData.courier}. Consignment No: ${shippingData.awb}. Track here: https://www.indiapost.gov.in`);
        console.log("WhatsApp Notification Sent:", message);
      }

      setShowShippingModal(false);
      setShippingData({ awb: '', courier: 'India Post (Speed Post)', orderId: '' });
      alert("Order marked as shipped via India Post! Customer notified.");
    } catch (error) {
      console.error("Error updating shipping:", error);
      alert("Failed to update shipping.");
    }
  };

  const handleReachedOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'reached'
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <p className="text-zinc-500 text-sm animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white pb-20">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-zinc-800">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-black mb-4">Login Required</h1>
          <p className="text-zinc-400 mb-8">Please login to access the seller dashboard.</p>
          <button onClick={() => navigate('/')} className="bg-white text-black font-bold px-8 py-3 rounded-xl">Go to Home</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!sellerProfile) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Dedicated Seller Header */}
        <header className="sticky top-0 z-[150] bg-black/80 backdrop-blur-xl border-b border-zinc-800 px-4 py-4">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter">NeuC2M<span className="text-purple-500">.in</span></span>
            </div>
            <button 
              onClick={() => setShowApplyModal(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white font-black px-6 py-2.5 rounded-full text-sm transition-all shadow-lg shadow-orange-500/20"
            >
              Start Selling
            </button>
          </div>
        </header>
        
        {/* Amazon-style Seller Landing Page Content */}
        <div className="relative overflow-hidden">
          {/* Top Banner */}
          <div className="bg-zinc-900 border-b border-zinc-800 py-3 px-4 text-center">
            <div className="max-w-md mx-auto flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
              <p className="text-xs md:text-sm font-medium text-zinc-300">
                Get up to <span className="text-white font-bold">70% fee savings</span> in 1800+ categories. <button className="underline hover:text-purple-400 ml-1 font-bold">Explore now</button>
              </p>
            </div>
          </div>

          {/* Hero Section */}
          <div className="max-w-md mx-auto px-4 py-16 md:py-24 relative">
            <div className="grid grid-cols-1 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10"
              >
                <h1 className="text-6xl md:text-8xl font-black leading-[1] mb-8 tracking-tight">
                  ZERO <span className="text-zinc-500">referral fee</span> on over <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">12.5 crore</span> products
                </h1>
                <p className="text-xl text-zinc-400 mb-10 max-w-lg leading-relaxed">
                  Register with a valid GSTIN and an active bank account to become a NeuC2M.in seller.
                </p>
                <button 
                  onClick={() => setShowApplyModal(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-black px-12 py-5 rounded-2xl text-xl transition-all shadow-2xl shadow-orange-500/20 hover:scale-105 active:scale-95"
                >
                  Start Selling
                </button>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative"
              >
                <div className="relative z-10 rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
                  <div className="aspect-[4/3] relative">
                    <img 
                      src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1000" 
                      alt="Seller booth" 
                      className="w-full h-full object-cover opacity-60"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 text-center">
                        <p className="text-orange-500 font-black text-2xl mb-1">Fee Drop</p>
                        <p className="text-white font-bold text-xl">Live Now</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px]"></div>
              </motion.div>
            </div>
          </div>

          {/* Trust Section */}
          <div className="bg-zinc-950 py-20 border-y border-zinc-900">
            <div className="max-w-md mx-auto px-4">
              <div className="grid grid-cols-2 gap-8 text-center">
                {[
                  { label: "Active Sellers", value: "1.2M+" },
                  { label: "Products Listed", value: "125M+" },
                  { label: "Cities Covered", value: "19,000+" },
                  { label: "Seller Support", value: "24/7" }
                ].map((stat, i) => (
                  <div key={i}>
                    <p className="text-3xl md:text-5xl font-black text-white mb-2">{stat.value}</p>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="py-24">
            <div className="max-w-md mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-black mb-4">Why sell on NeuC2M?</h2>
                <p className="text-zinc-500 text-xl">Everything you need to grow your fashion brand</p>
              </div>
              <div className="grid grid-cols-1 gap-8">
                {[
                  { 
                    title: "Reach Millions", 
                    desc: "Showcase your products to a massive audience of fashion enthusiasts across the country.",
                    icon: <ShoppingBag className="w-8 h-8 text-orange-400" />
                  },
                  { 
                    title: "Secure Payments", 
                    desc: "Get paid on time, every time. Our secure payment gateway handles everything for you.",
                    icon: <CheckCircle2 className="w-8 h-8 text-green-400" />
                  },
                  { 
                    title: "Seller Tools", 
                    desc: "Access professional dashboards, inventory management, and sales analytics tools.",
                    icon: <BarChart3 className="w-8 h-8 text-blue-400" />
                  }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -10 }}
                    className="bg-zinc-900/30 border border-zinc-800 p-10 rounded-[2.5rem] hover:border-orange-500/30 transition-all"
                  >
                    <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                    <p className="text-zinc-400 leading-relaxed text-lg">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="py-24 text-center px-4">
            <div className="max-w-md mx-auto bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-[4rem] p-12 md:p-24 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-5xl md:text-7xl font-black mb-10 leading-tight">Ready to start your journey?</h2>
                <button 
                  onClick={() => setShowApplyModal(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-black px-16 py-6 rounded-2xl text-2xl hover:scale-105 transition-all shadow-2xl shadow-orange-500/20"
                >
                  Register Now
                </button>
                <p className="mt-10 text-zinc-500 font-medium">No hidden charges. Transparent pricing. 24/7 Support.</p>
              </div>
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]"></div>
            </div>
          </div>
        </div>

        {/* Apply Modal (Multi-step Onboarding) */}
        <AnimatePresence>
          {showApplyModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-zinc-900 w-full max-w-2xl rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-3xl font-black tracking-tight">Seller Onboarding</h3>
                    <p className="text-zinc-500 text-sm mt-1">Step {onboardingStep} of 4</p>
                  </div>
                  <button onClick={() => setShowApplyModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-8 h-8" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full mb-10 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(onboardingStep / 4) * 100}%` }}
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-600"
                  />
                </div>

                <div className="space-y-8">
                  {onboardingStep === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h4 className="text-xl font-bold">Basic Information</h4>
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Full Name</label>
                          <input 
                            type="text" 
                            value={onboardingData.fullName || ''}
                            onChange={(e) => setOnboardingData({...onboardingData, fullName: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="Your Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Mobile Number</label>
                          <input 
                            type="tel" 
                            value={onboardingData.phone}
                            onChange={(e) => setOnboardingData({...onboardingData, phone: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="+91 00000 00000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">WhatsApp Number</label>
                          <input 
                            type="tel" 
                            value={onboardingData.whatsappNumber || ''}
                            onChange={(e) => setOnboardingData({...onboardingData, whatsappNumber: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="+91 00000 00000"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Email Address</label>
                          <input 
                            type="email" 
                            value={onboardingData.email}
                            onChange={(e) => setOnboardingData({...onboardingData, email: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {onboardingStep === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h4 className="text-xl font-bold">Business Profile</h4>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Store Name</label>
                          <input 
                            type="text" 
                            value={onboardingData.shopName}
                            onChange={(e) => setOnboardingData({...onboardingData, shopName: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="e.g. Urban Threads"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Company Type</label>
                          <select 
                            value={onboardingData.companyType}
                            onChange={(e) => setOnboardingData({...onboardingData, companyType: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                          >
                            <option value="Individual">Individual</option>
                            <option value="LLP">LLP</option>
                            <option value="Pvt Ltd">Pvt Ltd</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">GST Number</label>
                          <input 
                            type="text" 
                            value={onboardingData.gstNumber}
                            onChange={(e) => setOnboardingData({...onboardingData, gstNumber: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="22AAAAA0000A1Z5"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {onboardingStep === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h4 className="text-xl font-bold">Pickup Address</h4>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Street Address</label>
                          <input 
                            type="text" 
                            value={onboardingData.pickupAddress.street}
                            onChange={(e) => setOnboardingData({...onboardingData, pickupAddress: {...onboardingData.pickupAddress, street: e.target.value}})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="123 Fashion Street"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">City</label>
                          <input 
                            type="text" 
                            value={onboardingData.pickupAddress.city}
                            onChange={(e) => setOnboardingData({...onboardingData, pickupAddress: {...onboardingData.pickupAddress, city: e.target.value}})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="Mumbai"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Pincode</label>
                          <input 
                            type="text" 
                            value={onboardingData.pickupAddress.zip}
                            onChange={(e) => setOnboardingData({...onboardingData, pickupAddress: {...onboardingData.pickupAddress, zip: e.target.value}})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="400001"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {onboardingStep === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <h4 className="text-xl font-bold">Bank Details</h4>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Account Number</label>
                          <input 
                            type="text" 
                            value={onboardingData.bankDetails.accountNumber}
                            onChange={(e) => setOnboardingData({...onboardingData, bankDetails: {...onboardingData.bankDetails, accountNumber: e.target.value}})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="000000000000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">IFSC Code</label>
                          <input 
                            type="text" 
                            value={onboardingData.bankDetails.ifscCode}
                            onChange={(e) => setOnboardingData({...onboardingData, bankDetails: {...onboardingData.bankDetails, ifscCode: e.target.value}})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="SBIN0000000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Cancelled Cheque URL</label>
                          <input 
                            type="text" 
                            value={onboardingData.bankDetails.cancelledChequeUrl}
                            onChange={(e) => setOnboardingData({...onboardingData, bankDetails: {...onboardingData.bankDetails, cancelledChequeUrl: e.target.value}})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-8">
                    {onboardingStep > 1 && (
                      <button 
                        onClick={() => setOnboardingStep(onboardingStep - 1)}
                        className="flex-1 bg-zinc-800 text-white font-bold py-5 rounded-2xl hover:bg-zinc-700 transition-all"
                      >
                        Back
                      </button>
                    )}
                    <button 
                      onClick={() => onboardingStep === 4 ? handleApply() : setOnboardingStep(onboardingStep + 1)}
                      className="flex-[2] bg-orange-600 text-white font-black py-5 rounded-2xl text-lg hover:bg-orange-500 transition-all shadow-xl shadow-orange-500/20"
                    >
                      {onboardingStep === 4 ? 'Submit Application' : 'Continue'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <BottomNav />
      </div>
    );
  }

  if (sellerProfile.status === 'pending') {
    navigate('/seller-pending');
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <Header />
      
      {/* Dashboard Header */}
      <div className="bg-zinc-950 border-b border-zinc-900 pt-8 pb-6 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">{sellerProfile.shopName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-500/30">Active Seller</span>
                  <span className="text-zinc-500 text-xs">• Dashboard</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
              {[
                { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
                { id: 'orders', label: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
                { id: 'earnings', label: 'Earnings', icon: <BarChart3 className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    activeTab === tab.id ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Sales', value: `₹${orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0).toLocaleString()}`, icon: <BarChart3 className="text-purple-400" /> },
                { label: 'Total Orders', value: orders.length, icon: <ShoppingBag className="text-pink-400" /> },
                { label: 'Active Products', value: products.length, icon: <Package className="text-blue-400" /> },
                { label: 'Shop Rating', value: '4.8', icon: <Star className="text-yellow-400 fill-yellow-400" /> },
              ].map((stat, i) => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
                  <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center mb-4 border border-zinc-800">
                    {stat.icon}
                  </div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent Orders Preview */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Recent Orders</h3>
                <button onClick={() => setActiveTab('orders')} className="text-purple-400 text-sm font-bold hover:underline">View All</button>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">No orders yet.</div>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-900">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-zinc-700" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Order #{order.id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-zinc-500">{new Date(order.createdAt?.toDate()).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{parseFloat(order.total).toLocaleString()}</p>
                        <span className="text-[10px] uppercase font-black text-purple-400">{order.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">Manage Products</h3>
              <button 
                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                className="bg-white text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-zinc-200 transition-colors"
              >
                <Plus className="w-5 h-5" /> Add Product
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-purple-500/30 transition-all">
                  <div className="aspect-video relative overflow-hidden">
                    <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button 
                        onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                        className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-purple-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg line-clamp-1">{product.name}</h4>
                      <span className="text-purple-400 font-black">₹{product.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-zinc-400">Stock: <span className="text-white font-bold">{product.stock}</span></span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded text-zinc-400">{product.category}</span>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-full text-center py-20 bg-zinc-900/20 border border-zinc-800 border-dashed rounded-[2.5rem]">
                  <p className="text-zinc-500">No products added yet. Start by adding your first product!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-2xl font-bold">Customer Orders</h3>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-900/50 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Order ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Product</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-zinc-400">#{order.id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-4 text-sm">{new Date(order.createdAt?.toDate()).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-bold">{order.address?.name || 'Customer'}</td>
                      <td className="px-6 py-4 text-sm">
                        {order.items[0]?.name}
                        <p className="text-[10px] text-zinc-500">Qty: {order.items[0]?.quantity} | Color: {order.items[0]?.color}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-black">₹{parseFloat(order.total).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-black uppercase px-2 py-1 rounded-full border",
                          order.status === 'delivered' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          order.status === 'shipped' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          order.status === 'reached' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          order.status === 'processing' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        )}>
                          {order.status}
                        </span>
                        {order.awb && (
                          <p className="text-[9px] text-zinc-500 mt-1 font-mono">{order.courier}: {order.awb}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {order.status === 'processing' && (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleMarkAsShipped(order.id)}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 px-3 rounded-lg transition-all"
                            >
                              Ship Order
                            </button>
                          </div>
                        )}
                        {order.status === 'shipped' && (
                          <button 
                            onClick={() => handleReachedOrder(order.id)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold py-2 px-3 rounded-lg transition-all"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="text-center py-20 text-zinc-500">No orders found.</div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'earnings' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total Earnings</p>
                <p className="text-4xl font-black">₹{(sellerProfile.totalEarnings || 0).toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Pending Payout</p>
                <p className="text-4xl font-black text-orange-500">₹{(sellerProfile.pendingPayouts || 0).toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] flex flex-col justify-center">
                <button className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all">
                  Request Payout
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8">
              <h3 className="text-xl font-bold mb-6">Payout History</h3>
              <div className="text-center py-10 text-zinc-500">No payouts yet.</div>
            </div>
          </div>
        )}
      </div>

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900 w-full max-w-2xl rounded-[2.5rem] p-8 border border-zinc-800 max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowProductModal(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            
            <ProductForm 
              initialData={editingProduct} 
              onSubmit={handleSaveProduct} 
              onCancel={() => setShowProductModal(false)} 
            />
          </div>
        </div>
      )}

      {/* Shipping Modal */}
      <AnimatePresence>
        {showShippingModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShippingModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Ship Order</h3>
                  <p className="text-xs text-zinc-500">Enter tracking details for the customer</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Shipping Method</label>
                  <select 
                    value={shippingData.courier}
                    onChange={(e) => setShippingData({...shippingData, courier: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="India Post (Speed Post)">India Post (Speed Post)</option>
                    <option value="India Post (Registered Post)">India Post (Registered Post)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Consignment Number</label>
                  <input 
                    type="text"
                    value={shippingData.awb}
                    onChange={(e) => setShippingData({...shippingData, awb: e.target.value})}
                    placeholder="e.g. EK123456789IN"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-blue-500 outline-none transition-all text-sm font-mono"
                  />
                </div>

                <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">India Post Reliability</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Speed Post is highly reliable for all pin codes in Tamil Nadu. Delivery usually takes 1-4 working days.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowShippingModal(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmShipping}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all text-sm shadow-lg shadow-blue-500/20"
                  >
                    Confirm Shipment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Popup */}
      <AnimatePresence>
        {showDeleteSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-[300] bg-green-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-6 h-6" />
            <p className="font-bold">Your product has been deleted!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function ProductForm({ initialData, onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    mrp: initialData?.mrp || 0,
    sellingPrice: initialData?.sellingPrice || 0,
    price: initialData?.price || 0,
    category: initialData?.category || 'Fashion',
    subCategory: initialData?.subCategory || 'T-shirt',
    customSubCategory: '',
    stock: initialData?.stock || 0,
    sku: initialData?.sku || '',
    img: initialData?.img || '',
    images: initialData?.images || [],
    localImagePath: initialData?.localImagePath || '',
    fabric: initialData?.fabric || '',
    fit: initialData?.fit || '',
    washCare: initialData?.washCare || '',
    occasion: initialData?.occasion || '',
    sizes: initialData?.sizes || ['S', 'M', 'L', 'XL'],
    colors: initialData?.colors || [{ name: 'Black', hex: '#000000' }],
    type: initialData?.type || 'Clothing',
    c2m: initialData?.c2m || false,
    highlights: initialData?.highlights || [''],
    rating: initialData?.rating || 0,
    reviewCount: initialData?.reviewCount || 0,
    brand: initialData?.brand || '',
    discountPercentage: initialData?.discountPercentage || 0,
    deliveryDate: initialData?.deliveryDate || '',
    tags: initialData?.tags || [],
    isAd: initialData?.isAd || false,
    isBestseller: initialData?.isBestseller || false,
    dealTag: initialData?.dealTag || ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.img && !formData.localImagePath && !imageFile) {
      alert("Please provide at least one product image URL or select a local file.");
      return;
    }
    
    setIsSubmitting(true);
    let finalImgUrl = formData.img;
    let finalImages = [...formData.images];

    if (imageFile) {
      try {
        const base64Image = await compressImage(imageFile);
        finalImgUrl = base64Image;
        finalImages[0] = base64Image;
      } catch (error) {
        console.error("Error compressing image:", error);
        alert("Failed to process image. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

    await onSubmit({
      ...formData,
      subCategory: formData.subCategory === 'Other' ? formData.customSubCategory : formData.subCategory,
      img: finalImgUrl,
      images: finalImages,
      price: formData.sellingPrice 
    });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Product Title</label>
            <input 
              type="text" required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
              placeholder="e.g. Premium Cotton T-Shirt"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">MRP (₹)</label>
              <input 
                type="number" required
                value={formData.mrp}
                onChange={(e) => setFormData({...formData, mrp: parseFloat(e.target.value) || 0})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Selling Price (₹)</label>
              <input 
                type="number" required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({...formData, sellingPrice: parseFloat(e.target.value) || 0})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
            >
              <option value="Mens">Mens</option>
              <option value="Womens">Womens</option>
              <option value="Kids">Kids</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Sub-Category</label>
            <select 
              value={formData.subCategory}
              onChange={(e) => setFormData({...formData, subCategory: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
            >
              <option value="T-shirt">T-shirt</option>
              <option value="Shirt">Shirt</option>
              <option value="Jeans">Jeans</option>
              <option value="Dress">Dress</option>
              <option value="Hoodie">Hoodie</option>
              <option value="Jacket">Jacket</option>
              <option value="Trousers">Trousers</option>
              <option value="Saree">Saree</option>
              <option value="Kurta">Kurta</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
              <option value="Other">Other (Type below)</option>
            </select>
          </div>
          {formData.subCategory === 'Other' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2"
            >
              <input 
                type="text" required
                value={formData.customSubCategory}
                onChange={(e) => setFormData({...formData, customSubCategory: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                placeholder="Enter custom sub-category"
              />
            </motion.div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Stock</label>
              <input 
                type="number" required
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">SKU ID</label>
              <input 
                type="text" required
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                placeholder="SKU-001"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Product Images (URLs)</label>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <input 
                    type="text"
                    value={formData.images[i] || ''}
                    onChange={(e) => {
                      const newImages = [...formData.images];
                      newImages[i] = e.target.value;
                      setFormData({...formData, images: newImages, img: newImages[0] || ''});
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                    placeholder={i === 0 ? "Primary Image URL (Required)" : `Image URL ${i + 1} (Optional)`}
                  />
                  {i === 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">OR</span>
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            const newImages = [...formData.images];
                            const objectUrl = URL.createObjectURL(file);
                            newImages[0] = objectUrl;
                            setFormData({...formData, localImagePath: file.name, img: objectUrl, images: newImages});
                          }
                        }}
                        className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                      />
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-zinc-500">Add at least one high-quality image URL or select a local file.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Brand Name</label>
            <input 
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({...formData, brand: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
              placeholder="e.g. METRONAUT"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Discount %</label>
              <input 
                type="number"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({...formData, discountPercentage: parseFloat(e.target.value) || 0})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g. 78"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Delivery Date</label>
              <input 
                type="text"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g. 19th Apr"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Deal Tag</label>
              <input 
                type="text"
                value={formData.dealTag}
                onChange={(e) => setFormData({...formData, dealTag: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g. Hot Deal"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Tags (comma separated)</label>
              <input 
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g. #Checks, #Cotton"
              />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={formData.isAd}
                onChange={(e) => setFormData({...formData, isAd: e.target.checked})}
                className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-zinc-300">Mark as AD</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={formData.isBestseller}
                onChange={(e) => setFormData({...formData, isBestseller: e.target.checked})}
                className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-zinc-300">Mark as Bestseller</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Description</label>
            <textarea 
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 focus:border-orange-500 outline-none transition-all h-40 resize-none"
              placeholder="Detailed product description..."
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-8 border-t border-zinc-800">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="flex-1 bg-zinc-800 text-white font-bold py-5 rounded-2xl hover:bg-zinc-700 transition-all disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="flex-[2] bg-gradient-to-r from-orange-600 to-pink-600 text-white font-black py-5 rounded-2xl text-lg hover:opacity-90 transition-opacity shadow-xl shadow-orange-500/20 disabled:opacity-50">
          {isSubmitting ? 'Saving...' : (initialData ? 'Update Product' : 'Add Product')}
        </button>
      </div>
    </form>
  );
}
