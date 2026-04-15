import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { auth, db } from '../lib/firebase';
import { LogOut, User, Mail, Calendar, ShoppingBag, Package, ChevronRight, Clock, MapPin, Plus, Edit2, Trash2, CheckCircle2, X, Info, Store, Truck, ShieldCheck, Copy } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';

interface Order {
  id: string;
  items: any[];
  total: string;
  status: string;
  createdAt: any;
}

interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  
  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: ''
  });

  useEffect(() => {
    if (!user) return;

    // Orders Listener
    const ordersQ = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoadingOrders(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoadingOrders(false);
    });

    // Addresses Listener
    const addressesQ = query(
      collection(db, `users/${user.uid}/addresses`)
    );

    const unsubscribeAddresses = onSnapshot(addressesQ, (snapshot) => {
      const addressesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Address[];
      setAddresses(addressesData);
      setLoadingAddresses(false);
    }, (error) => {
      console.error("Error fetching addresses:", error);
      setLoadingAddresses(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeAddresses();
    };
  }, [user]);

  if (!user) {
    navigate('/');
    return null;
  }

  const handleCancelOrder = async (order: any) => {
    if (!order.createdAt) return;
    
    const orderTime = order.createdAt.toDate().getTime();
    const currentTime = new Date().getTime();
    const diffHours = (currentTime - orderTime) / (1000 * 60 * 60);
    
    if (diffHours > 24) {
      setAlertMessage("The order cannot be canceled after 24 hours.");
      setIsAlertModalOpen(true);
      return;
    }
    
    setOrderToCancel(order.id);
    setIsConfirmModalOpen(true);
  };

  const confirmCancellation = async () => {
    if (!orderToCancel) return;
    try {
      await updateDoc(doc(db, 'orders', orderToCancel), { status: 'cancelled' });
      setIsConfirmModalOpen(false);
      setOrderToCancel(null);
    } catch (error) {
      console.error("Error cancelling order:", error);
      setAlertMessage("Failed to cancel order. Please try again.");
      setIsAlertModalOpen(true);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const handleOpenAddressModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        name: address.name,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip
      });
    } else {
      if (addresses.length >= 3) {
        alert("You can only save up to 3 addresses.");
        return;
      }
      setEditingAddress(null);
      setAddressForm({ name: '', phone: '', street: '', city: '', state: '', zip: '' });
    }
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const addressData = {
        ...addressForm,
        userId: user.uid,
        isDefault: editingAddress ? editingAddress.isDefault : (addresses.length === 0)
      };

      if (editingAddress) {
        await updateDoc(doc(db, `users/${user.uid}/addresses`, editingAddress.id), addressData);
      } else {
        await addDoc(collection(db, `users/${user.uid}/addresses`), addressData);
      }
      setIsAddressModalOpen(false);
    } catch (error) {
      console.error("Error saving address:", error);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/addresses`, id));
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const batch = writeBatch(db);
      addresses.forEach(addr => {
        const addrRef = doc(db, `users/${user.uid}/addresses`, addr.id);
        batch.update(addrRef, { isDefault: addr.id === id });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error setting default address:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      <Header />
      
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-purple-900 to-pink-900"></div>
          
          <div className="px-8 pb-8 relative">
            {/* Avatar */}
            <div className="absolute -top-12 left-8">
              <div className="w-24 h-24 bg-zinc-800 rounded-2xl border-4 border-zinc-900 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-zinc-600" />
                )}
              </div>
            </div>

            <div className="pt-16 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-8">
              <div>
                <h1 className="text-3xl font-bold">{user.displayName || 'Neu User'}</h1>
                <p className="text-zinc-400 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" /> {user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 text-zinc-300 px-6 py-3 rounded-xl font-bold transition-all border border-zinc-700 hover:border-red-500/50"
              >
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 mt-8">
              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-400" /> Account Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Member Since</span>
                    <span className="text-zinc-200 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {new Date(user.metadata.creationTime || '').toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Total Order</span>
                    <span className="text-zinc-200 font-bold">{orders.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-400" /> Quick Links
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => handleOpenAddressModal()}
                    className="bg-zinc-900 hover:bg-zinc-800 p-4 rounded-xl text-sm transition-colors border border-zinc-800 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-purple-400" />
                      <span className="font-bold">Add / Edit Address</span>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-500 group-hover:text-white" />
                  </button>
                  <button 
                    onClick={() => {
                      const element = document.getElementById('pre-orders-section');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 p-4 rounded-xl text-sm transition-colors border border-zinc-800 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-pink-400" />
                      <span className="font-bold">My Order</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
                  </button>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-400" /> Seller Center
                </h3>
                <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                  Manage your shop, products, and orders. Apply to become a seller and start earning.
                </p>
                <Link 
                  to="/seller"
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-zinc-800 shadow-lg shadow-purple-500/10"
                >
                  Go to Seller Dashboard
                </Link>
              </div>
            </div>

            {/* Address Management Section */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-pink-500" /> My Addresses
                </h2>
                <span className="text-xs text-zinc-500">{addresses.length}/3 Saved</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className={`bg-zinc-950 border rounded-2xl p-5 relative group transition-all ${addr.isDefault ? 'border-purple-500 bg-purple-500/5' : 'border-zinc-800 hover:border-zinc-700'}`}>
                    {addr.isDefault && (
                      <div className="absolute -top-3 left-4 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Default
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-zinc-200">{addr.name}</h4>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenAddressModal(addr)} className="text-zinc-500 hover:text-purple-400"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      {addr.street}, {addr.city},<br />
                      {addr.state} - {addr.zip}<br />
                      Phone: {addr.phone}
                    </p>

                    {!addr.isDefault && (
                      <button 
                        onClick={() => handleSetDefault(addr.id)}
                        className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                ))}

                {addresses.length < 3 && (
                  <button 
                    onClick={() => handleOpenAddressModal()}
                    className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 hover:border-purple-500/50 hover:bg-zinc-900/50 transition-all text-zinc-500 hover:text-purple-400"
                  >
                    <Plus className="w-8 h-8" />
                    <span className="font-bold text-sm">Add New Address</span>
                  </button>
                )}
              </div>
            </div>

            {/* Orders Section */}
            <div className="mt-12" id="pre-orders-section">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-500" /> My Order
              </h2>
              
              {loadingOrders ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
                  <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 text-lg">You haven't placed any order yet.</p>
                  <button 
                    onClick={() => navigate('/')}
                    className="mt-4 text-purple-400 font-bold hover:text-purple-300 transition-colors"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: any) => (
                    <div key={order.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-purple-500/50 transition-all group">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Order #{order.id.slice(-8).toUpperCase()}</p>
                            <h4 className="font-bold text-zinc-200">₹{order.total}</h4>
                            {order.address && (
                              <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {order.address.street}, {order.address.city}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden md:block">
                            <p className="text-xs text-zinc-500 mb-1">Status</p>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                              order.status === 'delivered' ? 'bg-green-500/10 text-green-500' : 
                              order.status === 'shipped' ? 'bg-blue-500/10 text-blue-500' :
                              order.status === 'processing' ? 'bg-purple-500/10 text-purple-500' : 
                              order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                              'bg-orange-500/10 text-orange-500'
                            }`}>
                              {order.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right hidden md:block">
                            <p className="text-xs text-zinc-500 mb-1">Date</p>
                            <p className="text-sm text-zinc-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {order.createdAt?.toDate().toLocaleDateString()}
                            </p>
                          </div>
                          
                          {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'shipped' && (
                            <button 
                              onClick={() => handleCancelOrder(order)}
                              className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold px-4 py-2 rounded-lg transition-all border border-red-500/20"
                            >
                              Cancel
                            </button>
                          )}
                          
                          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-purple-500 transition-colors" />
                        </div>
                      </div>

                      {/* Flipkart-style Order Tracking Timeline */}
                      <div className="mt-6 pt-6 border-t border-zinc-800/50">
                        <div className="relative flex justify-between items-center max-w-lg mx-auto mb-8">
                          {/* Connecting Lines */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                              style={{ 
                                width: order.status === 'delivered' ? '100%' : 
                                       order.status === 'reached' ? '100%' :
                                       order.status === 'shipped' ? '66%' : 
                                       order.status === 'processing' ? '33%' : '0%' 
                              }}
                            ></div>
                          </div>

                          {/* Step 1: Ordered */}
                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all ${order.status !== 'cancelled' ? "bg-green-500 ring-4 ring-green-500/20" : "bg-zinc-700"}`}>
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ordered</span>
                          </div>

                          {/* Step 2: Processing */}
                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all ${['processing', 'shipped', 'reached', 'delivered'].includes(order.status) ? "bg-green-500 ring-4 ring-green-500/20" : "bg-zinc-800"}`}>
                              <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Packed</span>
                          </div>

                          {/* Step 3: Shipped */}
                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all ${['shipped', 'reached', 'delivered'].includes(order.status) ? "bg-green-500 ring-4 ring-green-500/20" : "bg-zinc-800"}`}>
                              <Truck className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Shipped</span>
                          </div>

                          {/* Step 4: Delivered */}
                          <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all ${['reached', 'delivered'].includes(order.status) ? "bg-green-500 ring-4 ring-green-500/20" : "bg-zinc-800"}`}>
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Delivered</span>
                          </div>
                        </div>

                        {/* Shipping Details Card */}
                        {order.status === 'shipped' && order.awb && (
                          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Truck className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">India Post Tracking</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-zinc-200">{order.awb}</p>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(order.awb);
                                      alert("Consignment Number copied!");
                                    }}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                    title="Copy Tracking ID"
                                  >
                                    <Copy className="w-3 h-3 text-zinc-500" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <a 
                              href={order.trackingUrl || `https://www.indiapost.gov.in/_layouts/15/dop.indiapost.tracking/trackconsignment.aspx`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest flex items-center gap-2"
                            >
                              Track on India Post
                              <ChevronRight className="w-4 h-4" />
                            </a>
                          </div>
                        )}

                        {order.status === 'processing' && (
                          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                              <ShieldCheck className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Prepaid Order - India Post</p>
                              <p className="text-xs text-zinc-500">The seller is packing your items. You'll receive a Speed Post consignment number shortly.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-8 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Notice</h3>
            <p className="text-zinc-400 mb-6">{alertMessage}</p>
            <button 
              onClick={() => setIsAlertModalOpen(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-8 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Cancel Order?</h3>
            <p className="text-zinc-400 mb-6">Are you sure you want to cancel this order? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                No, Keep it
              </button>
              <button 
                onClick={confirmCancellation}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Pages Section */}
      <div className="max-w-md mx-auto px-4 mt-8 mb-24">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-bold text-zinc-400 uppercase tracking-widest text-xs">Legal & Support</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            <Link to="/legal/privacy-policy" className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <span className="font-medium">Privacy Policy</span>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </Link>
            <Link to="/legal/terms-of-service" className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <span className="font-medium">Terms of Service</span>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </Link>
            <Link to="/legal/refund-policy" className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
              <span className="font-medium">Refund & Return Policy</span>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </Link>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
              <button onClick={() => setIsAddressModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-bold uppercase">Full Name</label>
                  <input 
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-purple-500 outline-none"
                    value={addressForm.name}
                    onChange={e => setAddressForm({...addressForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-bold uppercase">Phone Number</label>
                  <input 
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-purple-500 outline-none"
                    value={addressForm.phone}
                    onChange={e => setAddressForm({...addressForm, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-bold uppercase">Street / Area / House No.</label>
                <input 
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-purple-500 outline-none"
                  value={addressForm.street}
                  onChange={e => setAddressForm({...addressForm, street: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-bold uppercase">City</label>
                  <input 
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-purple-500 outline-none"
                    value={addressForm.city}
                    onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-bold uppercase">State</label>
                  <input 
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-purple-500 outline-none"
                    value={addressForm.state}
                    onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-bold uppercase">Zip Code</label>
                  <input 
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-purple-500 outline-none"
                    value={addressForm.zip}
                    onChange={e => setAddressForm({...addressForm, zip: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl mt-4 hover:opacity-90 transition-opacity"
              >
                Save Address
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
