import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import VideoReel from '../components/VideoReel';
import BottomNav from '../components/BottomNav';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const SAMPLE_C2M_PRODUCTS = [
  {
    _id: 'c2m_1',
    name: 'Cyberpunk Techwear Jacket',
    description: 'Limited edition C2M techwear jacket with integrated LED strips. Manufacturing starts once we hit 100 orders.',
    videoUrl: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&q=80',
    price: 4999,
    preOrderTarget: 100,
    currentPreOrders: 64,
    c2m: true,
    type: 'image',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Neon Black', hex: '#000000' },
      { name: 'Cyber Gray', hex: '#4A4A4A' }
    ],
    fabric: 'Gore-Tex Performance Shell',
    fit: 'Athletic Slim Fit',
    features: ['Integrated LED Strips', 'Waterproof Zippers', 'Modular Pockets', 'Breathable Mesh Lining'],
    occasion: 'Streetwear / Night Events',
    washCare: 'Hand Wash Only, Remove LED Battery',
    rating: 4.9,
    reviewCount: 124
  },
  {
    _id: 'c2m_2',
    name: 'Neural Link Smart Glasses',
    description: 'AR-enabled smart glasses for the next generation. Join the revolution. Zero inventory, pure demand-driven.',
    videoUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80',
    price: 8999,
    preOrderTarget: 50,
    currentPreOrders: 12,
    c2m: true,
    type: 'image',
    sizes: ['Standard'],
    colors: [
      { name: 'Titanium Silver', hex: '#C0C0C0' },
      { name: 'Obsidian Black', hex: '#1A1A1A' }
    ],
    fabric: 'Aerospace Grade Titanium',
    fit: 'Universal Fit',
    features: ['Retina Display AR', 'Bone Conduction Audio', 'Gesture Control', '12h Battery Life'],
    occasion: 'Tech Enthusiasts / Daily Use',
    washCare: 'Wipe with Microfiber Cloth',
    rating: 4.7,
    reviewCount: 45
  },
  {
    _id: 'c2m_3',
    name: 'Stealth Urban Backpack',
    description: 'Waterproof, anti-theft, and modular. The ultimate urban survival gear. Designed by Clan X community.',
    videoUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
    price: 2499,
    preOrderTarget: 200,
    currentPreOrders: 145,
    c2m: true,
    type: 'image',
    sizes: ['20L', '30L'],
    colors: [
      { name: 'Stealth Black', hex: '#000000' },
      { name: 'Desert Sand', hex: '#C2B280' }
    ],
    fabric: '1000D Cordura Nylon',
    fit: 'Ergonomic Back Support',
    features: ['Anti-Theft Zippers', 'USB Charging Port', 'Modular Attachments', 'Laptop Compartment (16")'],
    occasion: 'Urban Commute / Travel',
    washCare: 'Spot Clean with Damp Cloth',
    rating: 4.8,
    reviewCount: 210
  }
];

export default function C2MPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>(SAMPLE_C2M_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Trending');

  useEffect(() => {
    // Fetch Clan X posts to show in C2M feed
    const q = query(collection(db, 'clan_posts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clanPosts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(data => data.status === 'live')
        .map(data => {
        return {
          _id: data.id,
          name: data.productName || (data.authorName + "'s Exclusive"),
          description: data.description || 'Exclusive content from Clan X Leader',
          videoUrl: data.videoUrl,
          thumbnailUrl: data.thumbnailUrl,
          imageUrls: data.imageUrls || [data.videoUrl],
          type: data.type || 'image',
          price: data.price || 0,
          category: data.category || 'Trending',
          sizes: data.sizes || [],
          colors: data.colors || [],
          sellerId: data.authorId,
          authorId: data.authorId,
          authorName: data.authorName,
          authorPhoto: data.authorPhoto,
          preOrderTarget: 0,
          currentPreOrders: 0,
          c2m: true, // Enable ordering
          isClanPost: true
        };
      });

      // Merge sample products with clan posts
      const combined = [...clanPosts, ...SAMPLE_C2M_PRODUCTS];
      // Shuffle dynamically
      setProducts(combined.sort(() => Math.random() - 0.5));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching clan posts for C2M:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => p.category === filter || (filter === 'Trending' && !p.category) || (filter === 'Trending' && p.category === 'Trending'));

  const handleOrder = async (id: string, address: any, paymentMethod: string, size?: string, color?: string) => {
    if (!user) return;
    try {
      const product = products.find(p => p._id === id);
      if (!product) return;

      if (paymentMethod === 'online') {
        const response = await fetch('/api/create-razorpay-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: product.price })
        });
        const order = await response.json();

        if (order.error) throw new Error(order.error);

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
                    id: product._id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    size: size || undefined,
                    color: color || undefined,
                    sellerId: product.sellerId || 'admin'
                  }],
                  sellerIds: [product.sellerId || 'admin'],
                  total: product.price.toString(),
                  status: 'processing',
                  paymentMethod: 'online',
                  paymentStatus: 'paid',
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  address: address,
                  createdAt: serverTimestamp()
                });

                setProducts(prev => prev.map(p =>
                  p._id === id ? { ...p, currentPreOrders: p.currentPreOrders + 1 } : p
                ));
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
            name: address.name,
            email: user.email,
            contact: address.phone || ""
          },
          theme: { color: "#9333ea" }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          console.error(response.error);
          alert("Payment failed: " + response.error.description);
        });
        rzp.open();
        return;
      }

      // Add order to Firestore for WhatsApp
      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        items: [{
          id: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          size: size || undefined,
          color: color || undefined,
          sellerId: product.sellerId || 'admin'
        }],
        sellerIds: [product.sellerId || 'admin'],
        total: product.price.toString(),
        status: 'processing',
        paymentMethod: 'whatsapp',
        paymentStatus: 'whatsapp_pending',
        address: address,
        createdAt: serverTimestamp()
      });

      // Optimistic update for local sample data (if it's one of the sample products)
      setProducts(prev => prev.map(p =>
        p._id === id ? { ...p, currentPreOrders: p.currentPreOrders + 1 } : p
      ));
      
      const ADMIN_WHATSAPP_NUMBER = "918124623281"; // Replace with your actual WhatsApp number
      let message = `*New Order Request (ID: ${orderRef.id.slice(-8).toUpperCase()})*\n\n`;
      message += `*Items:*\n`;
      message += `- ${product.name} (Qty: 1, Size: ${size || 'N/A'}, Color: ${color || 'N/A'}) - ₹${product.price}\n`;
      message += `\n*Total Amount:* ₹${product.price.toLocaleString('en-IN')}\n\n`;
      message += `*Delivery Address:*\n${address.name}\n${address.phone}\n${address.street}, ${address.city}, ${address.state} - ${address.zip}\n\n`;
      message += `Please confirm my order and let me know how to pay.`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${ADMIN_WHATSAPP_NUMBER}&text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      alert("Order saved! Redirecting to WhatsApp to complete payment.");
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    }
  };

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="absolute top-0 w-full z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <Link to="/" className="p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            NeuC2M
          </h1>
        </div>
        <div className="flex gap-4 pointer-events-auto items-center">
          {user?.email === 'yuvarajs.1511@gmail.com' && (
            <Link to="/clan" className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20">
              + Post Image
            </Link>
          )}
          {['Trending', 'Mens', 'Womens', 'Kids'].map(f => (
            <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-md border ${filter === f ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Main Feed */}
      <main className="flex-1 relative bg-zinc-900">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <VideoReel 
            products={filteredProducts} 
            onOrder={handleOrder}
            onViewProfile={(authorId) => navigate(`/clan?leaderId=${authorId}`)}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
