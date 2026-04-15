import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { 
  ShoppingCart, Filter, ChevronRight, Star, X, CheckCircle2, MapPin, Plus, 
  CreditCard, ShieldCheck, MessageCircle, RefreshCw, Package, CheckCircle,
  UserPlus, MessageSquare, Play, Video, Eye, Instagram, Youtube, Facebook,
  ChevronLeft, Image as ImageIcon, Clock, Heart
} from 'lucide-react';
import ProductDetailModal from '../components/ProductDetailModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, query, onSnapshot, addDoc, serverTimestamp, where, 
  doc, setDoc, deleteDoc, increment, orderBy, limit, getDocs 
} from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ClanMember {
  id: string;
  userId: string;
  displayName: string;
  platform: string;
  photoURL?: string;
  status: string;
  username?: string;
}

interface ClanPost {
  id: string;
  authorId: string;
  authorName: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  type: 'video' | 'image';
  views: number;
  price: number;
  createdAt: any;
}

interface Product {
  _id: string;
  name: string;
  type: string;
  subCategory: string;
  price: number;
  img: string;
  rating: number;
  description: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  fabric: string;
  fit: string;
  features: string[];
  occasion: string;
  washCare: string;
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

const MOCK_PRODUCTS: { [key: string]: Product[] } = {
  mens: [
    { 
      _id: "m1",
      name: "Men's Solid Cotton T-Shirt", 
      type: "T-Shirts", 
      subCategory: "T-Shirts",
      price: 499, 
      img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80", 
      rating: 4.2,
      description: "Premium quality solid cotton t-shirt for everyday comfort. Breathable fabric and perfect fit.",
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: [{ name: 'White', hex: '#FFFFFF' }, { name: 'Black', hex: '#000000' }, { name: 'Navy', hex: '#000080' }],
      fabric: '100% Combed Cotton',
      fit: 'Regular Fit',
      features: ['Breathable Fabric', 'Reinforced Seams', 'Tagless Neck'],
      occasion: 'Casual Wear',
      washCare: 'Machine Wash Cold',
      reviewCount: 450,
      c2m: false
    },
    { 
      _id: "m2",
      name: "Slim Fit Casual Shirt", 
      type: "Casual & Formal Shirts", 
      subCategory: "Shirts",
      price: 899, 
      img: "https://images.unsplash.com/photo-1596755094514-f87e32f85e23?w=500&q=80", 
      rating: 4.5,
      description: "Stylish slim fit casual shirt. Perfect for office or evening outings.",
      sizes: ['M', 'L', 'XL'],
      colors: [{ name: 'Sky Blue', hex: '#87CEEB' }, { name: 'White', hex: '#FFFFFF' }],
      fabric: 'Cotton Linen Blend',
      fit: 'Slim Fit',
      features: ['Spread Collar', 'Button-Down Front', 'Curved Hem'],
      occasion: 'Casual / Semi-Formal',
      washCare: 'Machine Wash Warm',
      reviewCount: 230,
      c2m: false
    },
    { 
      _id: "m3",
      name: "Classic Blue Denim Jeans", 
      type: "Jeans & Trousers", 
      subCategory: "Jeans",
      price: 1299, 
      img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80", 
      rating: 4.1,
      description: "Timeless classic blue denim jeans. Durable and comfortable for all-day wear.",
      sizes: ['30', '32', '34', '36'],
      colors: [{ name: 'Indigo Blue', hex: '#00416A' }],
      fabric: 'Heavyweight Denim',
      fit: 'Straight Fit',
      features: ['5-Pocket Styling', 'Zip Fly', 'Belt Loops'],
      occasion: 'Casual Wear',
      washCare: 'Wash Separately, Inside Out',
      reviewCount: 560,
      c2m: false
    },
    { 
      _id: "m4",
      name: "Urban Streetwear Hoodie", 
      type: "Hoodies & Jackets", 
      subCategory: "Hoodies",
      price: 1499, 
      img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80", 
      rating: 4.8,
      description: "Cozy and stylish urban streetwear hoodie. Soft fleece lining for extra warmth.",
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Charcoal', hex: '#36454F' }, { name: 'Olive', hex: '#808000' }],
      fabric: 'Cotton Fleece',
      fit: 'Relaxed Fit',
      features: ['Kangaroo Pocket', 'Drawstring Hood', 'Ribbed Cuffs'],
      occasion: 'Winter / Streetwear',
      washCare: 'Machine Wash Cold',
      reviewCount: 180,
      c2m: false
    },
  ],
  womens: [
    { 
      _id: "w1",
      name: "Floral Summer Maxi Dress", 
      type: "Dresses & Gowns", 
      subCategory: "Dresses",
      price: 1499, 
      img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80", 
      rating: 4.7,
      description: "Elegant floral maxi dress for the perfect summer look. Lightweight and flowy.",
      sizes: ['S', 'M', 'L'],
      colors: [{ name: 'Floral Pink', hex: '#FFC0CB' }, { name: 'Floral Yellow', hex: '#FFFFE0' }],
      fabric: 'Viscose Rayon',
      fit: 'Flowy Maxi Fit',
      features: ['Adjustable Straps', 'Tiered Skirt', 'Smocked Back'],
      occasion: 'Summer Party / Beach',
      washCare: 'Hand Wash Cold',
      reviewCount: 340,
      c2m: false
    },
    { 
      _id: "w2",
      name: "Casual Crop Top", 
      type: "Tops & T-Shirts", 
      subCategory: "Tops",
      price: 599, 
      img: "https://images.unsplash.com/photo-1536766820879-059fec98ec0a?w=500&q=80", 
      rating: 4.4,
      description: "Trendy casual crop top. Pairs perfectly with high-waisted jeans.",
      sizes: ['XS', 'S', 'M'],
      colors: [{ name: 'Lavender', hex: '#E6E6FA' }, { name: 'White', hex: '#FFFFFF' }],
      fabric: 'Ribbed Cotton',
      fit: 'Slim Fit',
      features: ['Round Neck', 'Short Sleeves', 'Stretchable Fabric'],
      occasion: 'Casual Wear',
      washCare: 'Machine Wash Cold',
      reviewCount: 120,
      c2m: false
    },
    { 
      _id: "w3",
      name: "High-Waist Denim Jeans", 
      type: "Jeans & Trousers", 
      subCategory: "Jeans",
      price: 1399, 
      img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80", 
      rating: 4.6,
      description: "Flattering high-waist denim jeans. Designed to accentuate your curves.",
      sizes: ['26', '28', '30', '32'],
      colors: [{ name: 'Light Blue', hex: '#ADD8E6' }],
      fabric: 'Stretch Denim',
      fit: 'Skinny Fit',
      features: ['High-Rise Waist', '4-Way Stretch', 'Distressed Details'],
      occasion: 'Casual Wear',
      washCare: 'Machine Wash Cold',
      reviewCount: 410,
      c2m: false
    },
  ],
  kids: [
    { 
      _id: "k1",
      name: "Boys Graphic Print T-Shirt", 
      type: "T-Shirts & Shirts", 
      subCategory: "T-Shirts",
      price: 399, 
      img: "https://images.unsplash.com/photo-1519241047957-be31d7379a5d?w=500&q=80", 
      rating: 4.5,
      description: "Cool graphic print t-shirt for boys. Soft and durable for active play.",
      sizes: ['2-3Y', '4-5Y', '6-7Y'],
      colors: [{ name: 'Red', hex: '#FF0000' }, { name: 'Blue', hex: '#0000FF' }],
      fabric: '100% Cotton',
      fit: 'Regular Fit',
      features: ['Fun Graphics', 'Soft Neckline', 'Durable Print'],
      occasion: 'Playtime / Casual',
      washCare: 'Machine Wash Warm',
      reviewCount: 150,
      c2m: false
    },
    { 
      _id: "k2",
      name: "Girls Party Wear Dress", 
      type: "Dresses & Frocks", 
      subCategory: "Dresses",
      price: 899, 
      img: "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&q=80", 
      rating: 4.8,
      description: "Beautiful party wear dress for girls. Features delicate lace and a satin bow.",
      sizes: ['3-4Y', '5-6Y', '7-8Y'],
      colors: [{ name: 'White', hex: '#FFFFFF' }, { name: 'Pink', hex: '#FFC0CB' }],
      fabric: 'Net & Satin',
      fit: 'Fit & Flare',
      features: ['Lace Overlay', 'Satin Sash', 'Cotton Lining'],
      occasion: 'Parties / Weddings',
      washCare: 'Dry Clean Only',
      reviewCount: 95,
      c2m: false
    },
  ]
};

// Trending and New Arrivals are a mix of everything
const MIXED_PRODUCTS = [...MOCK_PRODUCTS.mens.slice(0, 2), ...MOCK_PRODUCTS.womens.slice(0, 2), ...MOCK_PRODUCTS.kids.slice(0, 2)].sort(() => Math.random() - 0.5);

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Product Detail & Order State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const ADMIN_WHATSAPP_NUMBER = "918124623281";

  // Phone Verification States
  const [isVerified, setIsVerified] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationPhone, setVerificationPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'phone' | 'code'>('phone');

  // Clan X States
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [posts, setPosts] = useState<ClanPost[]>([]);
  const [currentLeaderIndex, setCurrentLeaderIndex] = useState(0);
  const [selectedLeader, setSelectedLeader] = useState<ClanMember | null>(null);
  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({});
  const [isFollowing, setIsFollowing] = useState<Record<string, boolean>>({});

  // Fetch Clan Data
  useEffect(() => {
    const q = query(collection(db, 'clan_members'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClanMember));
      setMembers(membersData);
    }, (error) => {
      console.error("Clan members snapshot error:", error);
    });

    const postsQ = query(collection(db, 'clan_posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubPosts = onSnapshot(postsQ, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClanPost));
      setPosts(postsData);
    }, (error) => {
      console.error("Clan posts snapshot error:", error);
    });

    const followsUnsub = onSnapshot(collection(db, 'clan_follows'), (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => { counts[doc.id] = doc.data().count || 0; });
      setFollowCounts(counts);
    }, (error) => {
      console.error("Clan follows snapshot error:", error);
    });

    return () => {
      unsubscribe();
      unsubPosts();
      followsUnsub();
    };
  }, []);

  // Fetch User's Following Status
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, `users/${user.uid}/following`), (snapshot) => {
      const following: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => { following[doc.id] = true; });
      setIsFollowing(following);
    }, (error) => {
      console.error("User following snapshot error:", error);
    });
    return () => unsub();
  }, [user]);

  // Fetch User Verification Status
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setIsVerified(snapshot.data().isVerified || false);
      }
    }, (error) => {
      console.error("User verification snapshot error:", error);
    });
    return () => unsub();
  }, [user]);

  // Rotate Suggestions
  useEffect(() => {
    if (members.length > 0) {
      const interval = setInterval(() => {
        setCurrentLeaderIndex((prev) => (prev + 1) % members.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [members]);

  const handleFollow = async (leaderId: string) => {
    if (!user) {
      alert("Please login to follow creators.");
      return;
    }
    const isNowFollowing = !isFollowing[leaderId];
    setIsFollowing(prev => ({ ...prev, [leaderId]: isNowFollowing }));
    
    const countRef = doc(db, 'clan_follows', leaderId);
    await setDoc(countRef, {
      count: increment(isNowFollowing ? 1 : -1)
    }, { merge: true });

    const userFollowRef = doc(db, `users/${user.uid}/following`, leaderId);
    if (isNowFollowing) {
      await setDoc(userFollowRef, { timestamp: serverTimestamp() });
    } else {
      await deleteDoc(userFollowRef);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLeader || !messageText.trim()) return;
    try {
      await addDoc(collection(db, 'private_messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'User',
        receiverId: selectedLeader.userId,
        receiverName: selectedLeader.displayName,
        text: messageText,
        read: false,
        createdAt: serverTimestamp()
      });
      setMessageText('');
      setIsMessaging(false);
      alert("Message sent to " + selectedLeader.displayName);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleGetCode = () => {
    if (!verificationPhone || verificationPhone.length < 10) {
      alert("Please enter a valid phone number.");
      return;
    }
    setIsVerifying(true);
    // Simulate sending code
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationStep('code');
      alert("Verification code sent to " + verificationPhone + " (Demo Code: 123456)");
    }, 1500);
  };

  const handleVerifyCode = async () => {
    if (verificationCode !== '123456') {
      alert("Invalid verification code. Please try again.");
      return;
    }
    setIsVerifying(true);
    try {
      await setDoc(doc(db, 'users', user!.uid), {
        isVerified: true,
        phoneNumber: verificationPhone,
        verifiedAt: serverTimestamp()
      }, { merge: true });
      
      setIsVerified(true);
      setShowVerification(false);
      alert("Phone number verified successfully!");
    } catch (error) {
      console.error("Error verifying phone:", error);
      alert("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset filters when category changes
  useEffect(() => {
    setSelectedFilters([]);
    setAppliedFilters([]);
  }, [categoryId]);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));
      setFirestoreProducts(products);
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
    });

    return () => unsubscribe();
  }, [user, showAddressPicker]);
  
  // Determine which base products to show
  let baseProducts = [...MIXED_PRODUCTS];
  let title = `Results for "${categoryId}"`;

  if (categoryId === 'mens') {
    baseProducts = [...MOCK_PRODUCTS.mens, ...firestoreProducts.filter(p => p.category?.toLowerCase() === 'mens')];
    title = "Men's Clothing";
  } else if (categoryId === 'womens') {
    baseProducts = [...MOCK_PRODUCTS.womens, ...firestoreProducts.filter(p => p.category?.toLowerCase() === 'womens')];
    title = "Women's Clothing";
  } else if (categoryId === 'kids') {
    baseProducts = [...MOCK_PRODUCTS.kids, ...firestoreProducts.filter(p => p.category?.toLowerCase() === 'kids')];
    title = "Kids' Fashion";
  } else if (categoryId === 'new-arrivals') {
    title = "New Arrivals";
    baseProducts = [...MIXED_PRODUCTS, ...firestoreProducts];
  } else if (categoryId === 'trending') {
    title = "Trending";
    baseProducts = [...MIXED_PRODUCTS, ...firestoreProducts];
  } else {
    // Search functionality
    const queryStr = categoryId?.toLowerCase() || '';
    baseProducts = [
        ...MOCK_PRODUCTS.mens,
        ...MOCK_PRODUCTS.womens,
        ...MOCK_PRODUCTS.kids,
        ...firestoreProducts
    ].filter(p => 
      p.name?.toLowerCase().includes(queryStr) || 
      p.type?.toLowerCase().includes(queryStr) || 
      p.subCategory?.toLowerCase().includes(queryStr) ||
      p.category?.toLowerCase().includes(queryStr) ||
      p.description?.toLowerCase().includes(queryStr)
    );
  }

  // Dynamically generate filters based on available sub-categories in baseProducts
  const dynamicFilters = Array.from(new Set(
    baseProducts
      .map(p => p.subCategory || p.type)
      .filter(Boolean)
      .filter(f => f.toLowerCase() !== categoryId?.toLowerCase())
  )).sort() as string[];

  // Filter products based on applied filters
  const displayedProducts = appliedFilters.length > 0 
    ? baseProducts.filter(product => 
        appliedFilters.some(f => 
          (product.type && product.type.toLowerCase() === f.toLowerCase()) ||
          (product.subCategory && product.subCategory.toLowerCase() === f.toLowerCase())
        )
      )
    : baseProducts;

  const handleFilterChange = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const handleApplyFilters = () => {
    setAppliedFilters(selectedFilters);
  };

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleOrderClick = (size: string, color: string) => {
    if (!user) {
      alert("Please login to place an order.");
      return;
    }
    setSelectedSize(size);
    setSelectedColor(color);
    setShowAddressPicker(true);
  };

  const confirmOrder = async () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress || !selectedProduct) {
      alert("Please select or add an address first.");
      return;
    }

    setShowAddressPicker(false);
    setShowPaymentGateway(true);
  };

  const processPaymentAndOrder = async () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress || !selectedProduct) return;

    if (!isVerified) {
      setShowVerification(true);
      return;
    }

    setIsOrdering(true);
    try {
      // Fetch Seller WhatsApp Number
      const sellerDoc = await getDocs(query(collection(db, 'sellers'), where('uid', '==', selectedProduct.sellerId || 'admin')));
      const sellerData = sellerDoc.docs[0]?.data();
      const sellerWhatsapp = sellerData?.whatsappNumber || ADMIN_WHATSAPP_NUMBER;
      const sellerAddress = sellerData?.pickupAddress ? `${sellerData.pickupAddress.street}, ${sellerData.pickupAddress.city}, ${sellerData.pickupAddress.state} - ${sellerData.pickupAddress.zip}` : 'Seller Address Not Provided';

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

      setShowPaymentGateway(false);
      setShowProductDetail(false);
      
      // Generate WhatsApp Message
      let message = `*New Order Request (ID: ${orderRef.id.slice(-8).toUpperCase()})*\n\n`;
      message += `*Items:*\n`;
      message += `- ${selectedProduct.name} (Qty: 1, Size: ${selectedSize || 'N/A'}, Color: ${selectedColor || 'N/A'}) - ₹${selectedProduct.price}\n`;
      message += `\n*Total Amount:* ₹${selectedProduct.price.toLocaleString('en-IN')}\n\n`;
      message += `*Delivery Address:*\n${selectedAddress.name}\n${selectedAddress.phone}\n${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.zip}\n\n`;
      message += `*Shipping Info (India Post):*\n`;
      message += `- Main Cities: 1-2 days\n`;
      message += `- Other Districts: 2-3 days\n`;
      message += `- Villages: 3-4 days\n\n`;
      message += `*Payment:* Please share your GPay/PhonePe number for ₹${selectedProduct.price.toLocaleString('en-IN')}. I will ship via Speed Post once payment is confirmed.`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${sellerWhatsapp}&text=${encodedMessage}`;
      
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      
      // Redirect to profile page so they can see the order directly
      navigate('/profile');
      alert("Order saved! Redirecting to Seller's WhatsApp. You can track your order in your profile.");
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
      
      {/* Breadcrumbs */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-3 px-4">
        <div className="max-w-md mx-auto flex items-center text-xs text-zinc-400">
          <Link to="/" className="hover:text-purple-400">Home</Link>
          <ChevronRight className="w-3 h-3 mx-1" />
          <span className="text-zinc-200">{title}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Main Product Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{title}</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">Showing {displayedProducts.length} products</span>
              <button 
                onClick={() => setShowMobileFilters(true)}
                className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Horizontal Sub-Category Scroll */}
          <div className="flex overflow-x-auto gap-3 pb-4 mb-6 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 items-center">
            {appliedFilters.length > 0 && (
              <button 
                onClick={() => { setSelectedFilters([]); setAppliedFilters([]); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[10px] font-black bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-widest hover:text-white transition-colors shrink-0"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            <button 
              onClick={() => { setSelectedFilters([]); setAppliedFilters([]); }}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border uppercase tracking-wider",
                appliedFilters.length === 0 
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              )}
            >
              All
            </button>
            {dynamicFilters.map((filter, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  const isSelected = appliedFilters.includes(filter);
                  if (isSelected) {
                    const newFilters = appliedFilters.filter(f => f !== filter);
                    setSelectedFilters(newFilters);
                    setAppliedFilters(newFilters);
                  } else {
                    const newFilters = [...appliedFilters, filter];
                    setSelectedFilters(newFilters);
                    setAppliedFilters(newFilters);
                  }
                }}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border uppercase tracking-wider",
                  appliedFilters.includes(filter)
                    ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20" 
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          {displayedProducts.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
              <p className="text-zinc-400 text-lg">No products found for selected filters.</p>
              <button 
                onClick={() => { setSelectedFilters([]); setAppliedFilters([]); }}
                className="mt-4 text-purple-400 hover:text-purple-300 font-medium"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {displayedProducts.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => handleProductClick(item)}
                  className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="aspect-[3/4] bg-zinc-800 rounded-xl mb-3 overflow-hidden relative">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    
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
          )}
        </div>

        {/* Right Sidebar - Clan X Suggestions */}
        <div className="hidden xl:block w-72 shrink-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-sm uppercase tracking-widest text-purple-400">Suggested Leaders</h3>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50"></div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {members.length > 0 && (
                <motion.div 
                  key={currentLeaderIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div 
                    onClick={() => setSelectedLeader(members[currentLeaderIndex])}
                    className="cursor-pointer group"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative">
                      <img 
                        src={members[currentLeaderIndex].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${members[currentLeaderIndex].displayName}`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt="Leader"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-3 left-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white">@{members[currentLeaderIndex].displayName}</span>
                          <CheckCircle className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20" />
                        </div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{members[currentLeaderIndex].platform} Creator</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleFollow(members[currentLeaderIndex].id)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        isFollowing[members[currentLeaderIndex].id]
                        ? "bg-zinc-800 text-zinc-500 border border-zinc-700"
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                      )}
                    >
                      {isFollowing[members[currentLeaderIndex].id] ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={() => setSelectedLeader(members[currentLeaderIndex])}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>Followers</span>
                      <span className="text-purple-400">{followCounts[members[currentLeaderIndex].id] || 0}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Recent Activity</h4>
              {posts.slice(0, 3).map((post, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                  const leader = members.find(m => m.userId === post.authorId);
                  if (leader) setSelectedLeader(leader);
                }}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-800">
                    <img src={post.thumbnailUrl} className="w-full h-full object-cover" alt="Post" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-300 truncate">@{post.authorName}</p>
                    <p className="text-[9px] text-zinc-500 truncate">{post.description}</p>
                  </div>
                  <div className="text-[10px] font-bold text-purple-400 shrink-0">₹{post.price}</div>
                </div>
              ))}
            </div>
          </div>
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
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
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
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all border-green-500 bg-green-900/20"
                  )}
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-green-500">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                  </div>
                  <MessageCircle className="w-6 h-6 text-green-500" />
                  <div className="flex flex-col">
                    <span className="font-bold text-green-400">Prepaid via WhatsApp</span>
                    <span className="text-[10px] text-zinc-500">Secure GPay/PhonePe + India Post Delivery</span>
                  </div>
                </label>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Secure Payments</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    We use India Post Speed Post for 100% reliable delivery across Tamil Nadu. Pay securely via GPay/PhonePe after chatting with the seller.
                  </p>
                </div>
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
                  "w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:grayscale bg-green-600 hover:bg-green-700"
                )}
              >
                {isOrdering ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <>Order via WhatsApp ₹{selectedProduct?.price.toLocaleString('en-IN')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Phone Verification Modal */}
      <AnimatePresence>
        {showVerification && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVerification(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-950 border border-purple-500/30 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Phone Verification</h3>
                <button onClick={() => setShowVerification(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
              </div>

              <div className="mb-8">
                <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <ShieldCheck className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-center text-zinc-400 text-sm">
                  To pay via WhatsApp, you must verify your phone number first.
                </p>
              </div>

              {verificationStep === 'phone' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Phone Number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">+91</span>
                      <input 
                        type="tel"
                        placeholder="Enter 10 digit number"
                        value={verificationPhone}
                        onChange={(e) => setVerificationPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-14 pr-4 text-white outline-none focus:border-purple-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleGetCode}
                    disabled={isVerifying || verificationPhone.length < 10}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isVerifying ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Get Verification Code'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Enter 6-Digit Code</label>
                    <input 
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-4 text-center text-2xl tracking-[0.5em] text-white outline-none focus:border-purple-500 transition-all font-mono"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setVerificationStep('phone')}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleVerifyCode}
                      disabled={isVerifying || verificationCode.length < 6}
                      className="flex-[2] bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {isVerifying ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-zinc-500">
                    Didn't receive the code? <button onClick={handleGetCode} className="text-purple-400 hover:underline">Resend</button>
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clan Leader Profile Modal */}
      <AnimatePresence>
        {selectedLeader && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedLeader(null);
                setIsMessaging(false);
              }}
              className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
            ></motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border border-purple-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-purple-500/10 max-h-[90vh] overflow-y-auto hide-scrollbar"
            >
              {/* Profile Header Background */}
              <div className="h-48 bg-gradient-to-br from-black via-zinc-900 to-purple-500/30 relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <button 
                  onClick={() => {
                    setSelectedLeader(null);
                    setIsMessaging(false);
                  }}
                  className="absolute top-6 right-6 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all z-20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Info */}
              <div className="px-8 pb-12 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                  <div className="w-40 h-40 rounded-[2.5rem] p-1 bg-gradient-to-tr from-purple-400 to-lavender-400 shadow-2xl shadow-purple-500/20">
                    <div className="w-full h-full rounded-[2.3rem] bg-zinc-950 p-1">
                      <img 
                        src={selectedLeader.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedLeader.displayName}`} 
                        className="w-full h-full rounded-[2.2rem] object-cover"
                        alt={selectedLeader.displayName}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">{selectedLeader.displayName}</h2>
                      <CheckCircle className="w-6 h-6 text-purple-400 fill-purple-400/20" />
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex flex-col">
                        <span className="font-black text-purple-200 text-lg">{followCounts[selectedLeader.id] || 0}</span>
                        <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Followers</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-purple-200 text-lg">{posts.filter(p => p.authorId === selectedLeader.userId).length}</span>
                        <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Posts</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-purple-200 text-lg uppercase">{selectedLeader.platform}</span>
                        <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Platform</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mb-12">
                  <button 
                    onClick={() => handleFollow(selectedLeader.id)}
                    className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                      isFollowing[selectedLeader.id] 
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-400' 
                      : 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/40'
                    }`}
                  >
                    {isFollowing[selectedLeader.id] ? (
                      <>Following</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Follow</>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsMessaging(!isMessaging)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 text-purple-200"
                  >
                    <MessageSquare className="w-4 h-4" /> Message
                  </button>
                </div>

                {/* Messaging Section */}
                <AnimatePresence>
                  {isMessaging && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-12"
                    >
                      <form onSubmit={handleSendMessage} className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-3xl">
                        <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-4">Send Private Message</h4>
                        <textarea 
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Type your message here..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-purple-500 min-h-[100px] mb-4 text-white"
                        ></textarea>
                        <div className="flex justify-end">
                          <button 
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-white"
                          >
                            Send Message
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Leader's Posts Grid */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-400" /> Recent Content
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {posts.filter(p => p.authorId === selectedLeader.userId).map(post => (
                      <div key={post.id} className="aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden relative group border border-zinc-800">
                        <img 
                          src={post.thumbnailUrl || `https://picsum.photos/seed/${post.id}/400/600`} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          alt="Post"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-white">
                            <ImageIcon className="w-3 h-3" /> View
                          </div>
                        </div>
                      </div>
                    ))}
                    {posts.filter(p => p.authorId === selectedLeader.userId).length === 0 && (
                      <div className="col-span-3 py-12 text-center border border-dashed border-purple-500/20 rounded-3xl bg-purple-500/5">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">No posts yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {showMobileFilters && (
          <div className="fixed inset-0 z-[250] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full bg-zinc-900 rounded-t-[2.5rem] p-8 border-t border-zinc-800 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold">Filters</h3>
                <button onClick={() => setShowMobileFilters(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Sub-Categories</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {dynamicFilters.map((filter, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleFilterChange(filter)}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold border transition-all",
                          selectedFilters.includes(filter) 
                          ? "bg-purple-600 border-purple-500 text-white" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                        )}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    handleApplyFilters();
                    setShowMobileFilters(false);
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-5 rounded-2xl text-lg shadow-xl shadow-purple-500/20"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
