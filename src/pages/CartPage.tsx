import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, MapPin, CheckCircle2, X, Info, CreditCard, ShieldCheck, MessageCircle, RefreshCw, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'whatsapp'>('online');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const ADMIN_WHATSAPP_NUMBER = "918124623281"; // Replace with your actual WhatsApp number

  useEffect(() => {
    if (!user || !showAddressPicker) return;

    const q = query(collection(db, `users/${user.uid}/addresses`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const addrData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAddresses(addrData);
      const defaultAddr = addrData.find((a: any) => a.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (addrData.length > 0) setSelectedAddressId(addrData[0].id);
    });

    return () => unsubscribe();
  }, [user, showAddressPicker]);

  const handleCheckout = () => {
    if (!user) {
      alert("Please login to place an order.");
      return;
    }
    if (cart.length === 0) return;
    setShowAddressPicker(true);
  };

  const confirmOrder = async () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) {
      alert("Please select or add an address first.");
      return;
    }

    // Instead of ordering immediately, show the payment gateway
    setShowAddressPicker(false);
    setShowPaymentGateway(true);
  };

  const handleRazorpayPayment = async () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) return;

    setIsOrdering(true);
    try {
      const response = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalPrice })
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
                items: cart.map(item => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  size: item.size,
                  color: item.color,
                  sellerId: item.sellerId || 'admin'
                })),
                sellerIds: Array.from(new Set(cart.map(item => item.sellerId || 'admin'))),
                total: totalPrice.toString(),
                status: 'processing',
                paymentMethod: 'online',
                paymentStatus: 'paid',
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                address: selectedAddress,
                createdAt: serverTimestamp()
              });

              clearCart();
              setShowPaymentGateway(false);
              alert("Payment successful! Order placed.");
              navigate('/profile');
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
    if (!selectedAddress) return;

    setIsOrdering(true);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          sellerId: item.sellerId || 'admin' // Fallback for mock products
        })),
        sellerIds: Array.from(new Set(cart.map(item => item.sellerId || 'admin'))),
        total: totalPrice.toString(),
        status: 'processing',
        paymentMethod: 'whatsapp',
        paymentStatus: 'whatsapp_pending',
        address: selectedAddress,
        createdAt: serverTimestamp()
      });

      clearCart();
      setShowPaymentGateway(false);
      
      // Generate WhatsApp Message
      let message = `*New Order Request (ID: ${orderRef.id.slice(-8).toUpperCase()})*\n\n`;
      message += `*Items:*\n`;
      cart.forEach(item => {
        message += `- ${item.name} (Qty: ${item.quantity}, Size: ${item.size}, Color: ${item.color}) - ₹${item.price}\n`;
      });
      message += `\n*Total Amount:* ₹${totalPrice.toLocaleString('en-IN')}\n\n`;
      message += `*Delivery Address:*\n${selectedAddress.name}\n${selectedAddress.phone}\n${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.zip}\n\n`;
      message += `Please confirm my order and let me know how to pay.`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${ADMIN_WHATSAPP_NUMBER}&text=${encodedMessage}`;
      
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      alert("Order saved! Redirecting to WhatsApp to complete payment.");
      
      navigate('/profile');
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32">
      <Header />

      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-black tracking-tight">Your Cart</h1>
          <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-3 py-1 rounded-full">
            {totalItems} Items
          </span>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-zinc-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link to="/" className="inline-flex bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition-all">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={`${item.id}-${item.size}-${item.color}`} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 flex gap-4 group hover:border-purple-500/30 transition-all">
                  <div className="w-24 h-24 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-zinc-200 line-clamp-1">{item.name}</h3>
                        <button 
                          onClick={() => removeFromCart(item.id, item.size, item.color)}
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-3 mt-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded">Size: {item.size}</span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded">Color: {item.color}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="font-black text-white">₹{item.price.toLocaleString('en-IN')}</p>
                      <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1">
                        <button 
                          onClick={() => updateQuantity(item.id, item.size, item.color, item.quantity - 1)}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-zinc-200 w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.size, item.color, item.quantity + 1)}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 space-y-6">
              <h3 className="text-xl font-bold">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-zinc-400 text-sm">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-sm">
                  <span>Shipping</span>
                  <span className="text-green-500 font-bold uppercase text-[10px] tracking-widest">Free</span>
                </div>
                <div className="pt-4 border-t border-zinc-900 flex justify-between items-center">
                  <span className="text-lg font-bold">Total Amount</span>
                  <span className="text-2xl font-black text-white">₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-2xl shadow-purple-500/20"
              >
                <ShoppingBag className="w-5 h-5" />
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Address Picker Modal */}
      {showAddressPicker && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 w-full max-w-md rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom duration-300 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Select Delivery Address</h3>
              <button onClick={() => setShowAddressPicker(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2">
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-500 mb-4">No addresses found. Please add one in your profile.</p>
                  <button onClick={() => navigate('/profile')} className="text-purple-400 font-bold flex items-center gap-2 mx-auto">
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

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-zinc-400">Order Total</span>
                <span className="text-xl font-bold text-white">₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
              <button 
                onClick={confirmOrder}
                disabled={!selectedAddressId || isOrdering}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Mock Modal */}
      {showPaymentGateway && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Payment Header */}
            <div className="bg-zinc-100 p-6 border-b border-zinc-200 flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Secure Checkout</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-zinc-900">₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button onClick={() => setShowPaymentGateway(false)} className="p-2 bg-white rounded-full shadow-sm text-zinc-500 hover:text-zinc-900"><X className="w-5 h-5" /></button>
                  {/* Payment Methods */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <label 
                  onClick={() => setPaymentMethod('online')}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'online' ? "border-purple-500 bg-purple-50" : "border-zinc-200 hover:border-purple-200"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", paymentMethod === 'online' ? "border-purple-500" : "border-zinc-300")}>
                    {paymentMethod === 'online' && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}
                  </div>
                  <CreditCard className={cn("w-6 h-6", paymentMethod === 'online' ? "text-purple-600" : "text-zinc-400")} />
                  <div className="flex flex-col">
                    <span className={cn("font-bold", paymentMethod === 'online' ? "text-purple-900" : "text-zinc-700")}>Pay Online</span>
                    <span className="text-[10px] text-zinc-500">Credit/Debit Card, UPI, NetBanking</span>
                  </div>
                </label>

                <label 
                  onClick={() => setPaymentMethod('whatsapp')}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'whatsapp' ? "border-green-500 bg-green-50" : "border-zinc-200 hover:border-green-200"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", paymentMethod === 'whatsapp' ? "border-green-500" : "border-zinc-300")}>
                    {paymentMethod === 'whatsapp' && <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />}
                  </div>
                  <MessageCircle className={cn("w-6 h-6", paymentMethod === 'whatsapp' ? "text-green-600" : "text-zinc-400")} />
                  <div className="flex flex-col">
                    <span className={cn("font-bold", paymentMethod === 'whatsapp' ? "text-green-900" : "text-zinc-700")}>Share & Chat via WhatsApp</span>
                    <span className="text-[10px] text-zinc-500">Talk to us directly and pay securely</span>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex flex-col items-center justify-center gap-1 text-zinc-500 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-600">100% Secure & Encrypted</span>
                </div>
                <span className="text-[10px]">Your order details are safe from hackers</span>
              </div>

              <button 
                onClick={processPaymentAndOrder}
                disabled={isOrdering}
                className={cn(
                  "w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 mt-4",
                  paymentMethod === 'online' ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"
                )}
              >
                {isOrdering ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <>
                    {paymentMethod === 'online' ? 'Pay Online' : 'Share & Chat'} ₹{totalPrice.toLocaleString('en-IN')}
                  </>
                )}
              </button>
            </div>          </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
