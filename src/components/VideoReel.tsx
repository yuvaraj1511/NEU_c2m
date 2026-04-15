import React, { useEffect, useRef, useState } from 'react';
import { Heart, Share2, MessageCircle, ShoppingBag, CheckCircle2, MapPin, X, Plus, Info, Send, RefreshCw, CreditCard, ShieldCheck, Package, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import ProductDetailModal from './ProductDetailModal';

interface Product {
  _id: string;
  name: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  imageUrls?: string[]; // New field for multiple images
  type?: 'video' | 'image';
  price: number;
  preOrderTarget: number;
  currentPreOrders: number;
  c2m: boolean;
  isClanPost?: boolean;
  authorId?: string;
  authorName?: string;
  authorPhoto?: string;
  // New Professional Details
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  fabric?: string;
  fit?: string;
  features?: string[];
  occasion?: string;
  washCare?: string;
  rating?: number;
  reviewCount?: number;
  brand?: string;
  discountPercentage?: number;
  deliveryDate?: string;
  tags?: string[];
  isAd?: boolean;
  isBestseller?: boolean;
  dealTag?: string;
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

interface VideoReelProps {
  products: Product[];
  onOrder: (id: string, address: Address, paymentMethod: string, size?: string, color?: string) => void | Promise<void>;
  onRefresh?: () => Promise<void>;
  onViewProfile?: (authorId: string) => void;
}

export default function VideoReel({ products, onOrder, onRefresh, onViewProfile }: VideoReelProps) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    } else {
      setStartY(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      setPullDistance(Math.min(distance * 0.4, 80)); // Dampen the pull and cap at 80px
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep it open while refreshing
      
      if (onRefresh) {
        await onRefresh();
      } else {
        // Simulate refresh if no handler provided
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setStartY(0);
  };

  return (
    <div className="relative h-[calc(100vh-64px)] w-full bg-black overflow-hidden overscroll-none">
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-center z-50 pointer-events-none transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance > 0 ? pullDistance - 40 : -40}px)`, opacity: Math.min(pullDistance / 50, 1) }}
      >
        <div className="w-10 h-10 rounded-full bg-zinc-900 shadow-lg shadow-black/50 border border-zinc-800 flex items-center justify-center text-purple-500">
          <RefreshCw className={cn("w-5 h-5", isRefreshing ? "animate-spin" : "")} style={{ transform: !isRefreshing ? `rotate(${pullDistance * 2}deg)` : 'none' }} />
        </div>
      </div>

      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        style={{ 
          transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`, 
          transition: pullDistance === 0 || isRefreshing ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {products.map((product) => (
          <VideoItem key={product._id} product={product} onOrder={onOrder} onViewProfile={onViewProfile} />
        ))}
      </div>
    </div>
  );
}

const VideoItem: React.FC<{ 
  product: Product; 
  onOrder: (id: string, address: Address, paymentMethod: string, size?: string, color?: string) => void;
  onViewProfile?: (authorId: string) => void;
}> = ({ product, onOrder, onViewProfile }) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Address Selection State
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'whatsapp'>('online');
  const [isOrdering, setIsOrdering] = useState(false);

  // Product Detail State
  const [showProductDetail, setShowProductDetail] = useState(false);

  // Comments State
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showChat) return;
    const q = query(collection(db, `product_chats/${product._id}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [showChat, product._id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    try {
      await addDoc(collection(db, `product_chats/${product._id}/messages`), {
        text: newMessage,
        userId: user.uid,
        userName: user.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    if (!user || !showAddressPicker) return;

    const q = query(collection(db, `users/${user.uid}/addresses`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const addrData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Address));
      setAddresses(addrData);
      const defaultAddr = addrData.find(a => a.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (addrData.length > 0) setSelectedAddressId(addrData[0].id);
    });

    return () => unsubscribe();
  }, [user, showAddressPicker]);

  const [selectedSize, setSelectedSize] = useState<string | undefined>(product.sizes?.[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product.colors?.[0]?.name);

  const handleOrderClick = (size?: string, color?: string) => {
    if (!user) {
      alert("Please login to place an order.");
      return;
    }
    if (!hasOrdered) {
      if (size) setSelectedSize(size);
      if (color) setSelectedColor(color);
      setShowAddressPicker(true);
    }
  };

  const processPaymentAndOrder = async () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) return;

    setIsOrdering(true);
    try {
      await onOrder(product._id, selectedAddress, paymentMethod, selectedSize, selectedColor);
      setHasOrdered(true);
      setShowAddressPicker(false);
      setShowProductDetail(false);
    } catch (error) {
      console.error("Error placing order:", error);
    } finally {
      setIsOrdering(false);
    }
  };

  const progress = product.preOrderTarget > 0 ? Math.min((product.currentPreOrders / product.preOrderTarget) * 100, 100) : 0;

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} for ₹${product.price.toLocaleString('en-IN')}!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert("Link copied to clipboard!");
    }
  };

  const images = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [product.videoUrl];

  return (
    <div ref={containerRef} className="h-full w-full snap-start relative bg-zinc-900">
      <div className="h-full w-full relative overflow-hidden">
        <div 
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {images.map((url, idx) => (
            <img 
              key={idx}
              src={url} 
              className="h-full w-full object-cover shrink-0"
              alt={`${product.name} - ${idx + 1}`}
              referrerPolicy="no-referrer"
            />
          ))}
        </div>

        {/* Image Indicators */}
        {images.length > 1 && (
          <div className="absolute top-20 left-0 right-0 flex justify-center gap-1.5 z-20">
            {images.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  currentImageIndex === idx ? "w-6 bg-white" : "w-2 bg-white/30"
                )}
              />
            ))}
          </div>
        )}

        {/* Swipe Controls (Invisible overlays) */}
        {images.length > 1 && (
          <>
            <div 
              className="absolute inset-y-0 left-0 w-1/4 z-10" 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(prev => Math.max(0, prev - 1));
              }}
            />
            <div 
              className="absolute inset-y-0 right-0 w-1/4 z-10" 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1));
              }}
            />
          </>
        )}
      </div>
      
      {/* Gradient Overlays */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {/* Right Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center z-10">
        <button onClick={() => setIsLiked(!isLiked)} className="flex flex-col items-center gap-1">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white">
            <Heart className={cn("w-6 h-6 transition-colors", isLiked ? "fill-red-500 text-red-500" : "")} />
          </div>
          <span className="text-white text-xs font-medium">12K</span>
        </button>
        <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-1">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="text-white text-xs font-medium">Comments</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>
      </div>

      {/* Bottom Info */}
      <div 
        className="absolute bottom-6 left-4 right-20 text-white z-10"
      >
        {/* Clan X Leader Info */}
        {product.isClanPost && product.authorId && (
          <div className="flex items-center gap-3 mb-4 p-2 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 w-fit">
            <div 
              onClick={() => onViewProfile?.(product.authorId!)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full border-2 border-pink-500 overflow-hidden group-hover:scale-105 transition-transform">
                <img 
                  src={product.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.authorId}`} 
                  className="w-full h-full object-cover"
                  alt={product.authorName}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white group-hover:text-pink-400 transition-colors">@{product.authorName}</span>
                <span className="text-[10px] text-zinc-400">Clan X Leader</span>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsFollowing(!isFollowing);
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all",
                isFollowing ? "bg-zinc-800 text-zinc-400" : "bg-pink-600 text-white hover:bg-pink-500"
              )}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        )}

        <div 
          onClick={() => !product.isClanPost && setShowProductDetail(true)}
          className={cn(
            "cursor-pointer transition-transform active:scale-95",
            !product.isClanPost && "hover:translate-y-[-4px]"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("text-[10px] font-bold px-2 py-1 rounded tracking-wider uppercase", product.isClanPost ? "bg-pink-600" : "bg-purple-600")}>
              {product.isClanPost ? 'Clan X Exclusive' : 'C2M Order'}
            </div>
            <div className="bg-zinc-800/80 backdrop-blur-sm text-[10px] font-medium px-2 py-1 rounded text-zinc-300">
              {product.isClanPost ? 'Community Post' : 'Zero Inventory'}
            </div>
            {!product.isClanPost && (
              <div className="bg-white/10 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded text-white flex items-center gap-1">
                <Info className="w-3 h-3" /> View Details
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold mb-1 leading-tight">{product.name}</h2>
          <p className="text-sm text-gray-300 mb-5 line-clamp-2">{product.description}</p>
        </div>

        {(!product.isClanPost && (product.colors || product.sizes)) && (
          <div className="mb-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            {product.colors && product.colors.length > 0 && (
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all p-0.5",
                      selectedColor === color.name ? "border-purple-500 scale-110" : "border-transparent"
                    )}
                  >
                    <div className="w-full h-full rounded-full" style={{ backgroundColor: color.hex }}></div>
                  </button>
                ))}
              </div>
            )}
            {product.sizes && product.sizes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "w-10 h-10 rounded-xl border font-bold transition-all flex items-center justify-center text-sm",
                      selectedSize === size ? "border-purple-500 bg-purple-500/20 text-white" : "border-white/20 bg-black/40 text-gray-300 hover:border-white/40"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {product.c2m && (
          <>
            <div className="mb-5 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <div className="flex justify-between text-xs mb-2 font-medium">
                <span className="text-purple-400">{product.currentPreOrders} Order</span>
                <span className="text-gray-400">Goal: {product.preOrderTarget}</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOrderClick();
              }}
              disabled={hasOrdered}
              className={cn("w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]", hasOrdered ? "bg-green-500 text-white" : "bg-white text-black hover:bg-gray-100")}
            >
              {hasOrdered ? <><CheckCircle2 size={20} /> Ordered!</> : <><ShoppingBag size={20} /> Order Now • ₹{product.price.toLocaleString('en-IN')}</>}
            </button>
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      {!product.isClanPost && (
        <ProductDetailModal 
          product={product}
          isOpen={showProductDetail}
          onClose={() => setShowProductDetail(false)}
          onOrder={handleOrderClick}
        />
      )}

      {/* Address Picker & Payment Modal */}
      {showAddressPicker && (
        <div className="absolute inset-x-0 bottom-16 top-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 w-full rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom duration-300 border-t border-zinc-800 max-h-full overflow-y-auto hide-scrollbar">
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
                    {paymentMethod === 'online' && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" /> }
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
                <span className="text-xl font-bold text-white">₹{product.price.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex flex-col items-center justify-center gap-1 text-zinc-500 text-xs mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-500">100% Secure & Encrypted</span>
                </div>
                <span className="text-[10px]">Your order details are safe from hackers</span>
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
                    {paymentMethod === 'online' ? 'Pay Online' : 'Share & Chat'} ₹{product.price.toLocaleString('en-IN')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Overlay */}
      {showChat && (
        <div className="absolute inset-x-0 bottom-0 top-1/3 z-[100] bg-gradient-to-t from-black via-black/90 to-black/40 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <h3 className="text-white font-bold flex items-center gap-2">
              Comments
            </h3>
            <button onClick={() => setShowChat(false)} className="text-white/70 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/50 text-sm">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex flex-col">
                  <span className="text-[10px] text-white/50 font-bold mb-1">{msg.userName}</span>
                  <div className="bg-white/10 text-white text-sm px-4 py-2 rounded-2xl rounded-tl-none w-fit max-w-[80%]">
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={user ? "Add a comment..." : "Login to comment"}
              disabled={!user}
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button 
              type="submit" 
              disabled={!user || !newMessage.trim()}
              className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:bg-white/10 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
