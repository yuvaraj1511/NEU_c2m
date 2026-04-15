import React, { useState, useEffect } from 'react';
import { X, Heart, ShoppingBag, ShoppingCart, Star, ChevronRight, Truck, RefreshCw, Ruler, Info, CheckCircle2, Send, MapPin, Share2, ShieldCheck, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface Product {
  _id: string;
  name: string;
  description: string;
  videoUrl: string;
  img?: string;
  images?: string[];
  price: number;
  preOrderTarget: number;
  currentPreOrders: number;
  c2m: boolean;
  isClanPost?: boolean;
  category?: string;
  subCategory?: string;
  mrp?: number;
  rating?: number;
  reviewCount?: number;
  // New Professional Details
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  fabric?: string;
  fit?: string;
  features?: string[];
  occasion?: string;
  washCare?: string;
  brand?: string;
  discountPercentage?: number;
  deliveryDate?: string;
  tags?: string[];
  isAd?: boolean;
  isBestseller?: boolean;
  dealTag?: string;
}

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onOrder: (size: string, color: string) => void;
}

export default function ProductDetailModal({ product, isOpen, onClose, onOrder }: ProductDetailModalProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '');
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name || '');
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Pincode State
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [deliveryDate, setDeliveryDate] = useState('');

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length !== 6) return;
    
    setPincodeStatus('checking');
    setTimeout(() => {
      // Mock validation
      if (pincode.startsWith('0')) {
        setPincodeStatus('error');
      } else {
        setPincodeStatus('success');
        const date = new Date();
        date.setDate(date.getDate() + (product.c2m ? 14 : 4)); // C2M takes longer
        setDeliveryDate(date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }));
      }
    }, 1000);
  };

  useEffect(() => {
    if (!isOpen) return;
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', product._id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by createdAt descending client-side to avoid needing a composite index
      fetchedReviews.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setReviews(fetchedReviews);
    });
    return () => unsubscribe();
  }, [isOpen, product._id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReviewText.trim()) return;
    
    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: product._id,
        userId: user.uid,
        userName: user.email?.split('@')[0] || 'User',
        rating: newReviewRating,
        text: newReviewText,
        createdAt: serverTimestamp()
      });
      setNewReviewText('');
      setNewReviewRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddToCart = () => {
    addToCart({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.img || `https://picsum.photos/seed/${product._id}/300/300`,
      size: selectedSize,
      color: selectedColor,
      quantity: 1
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleOrder = () => {
    onOrder(selectedSize, selectedColor);
  };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden max-h-[90vh] flex flex-col border border-zinc-800 my-auto"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="bg-purple-600 text-[10px] font-bold px-2 py-1 rounded tracking-wider uppercase">
                  {product.c2m ? 'C2M Exclusive' : 'Premium Collection'}
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors">
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              {/* Product Info */}
              <section>
                {product.brand && (
                  <h3 className="text-purple-400 font-bold uppercase tracking-widest text-sm mb-2">{product.brand}</h3>
                )}
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
                    {product.name}
                  </h2>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={handleShare}
                      className="p-3 rounded-2xl border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white transition-all"
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => setIsWishlisted(!isWishlisted)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all",
                        isWishlisted ? "bg-pink-500/10 border-pink-500/50 text-pink-500" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                      )}
                    >
                      <Heart className={cn("w-6 h-6", isWishlisted ? "fill-current" : "")} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-bold">{product.rating || 4.5}</span>
                  </div>
                  <span className="text-zinc-500 text-sm">({product.reviewCount || 128} Reviews)</span>
                  <span className="text-zinc-500 text-sm">|</span>
                  <span className="text-zinc-500 text-sm">{product.category} / {product.subCategory}</span>
                </div>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-black text-white">₹{product.price.toLocaleString('en-IN')}</span>
                  {product.mrp && product.mrp > product.price && (
                    <>
                      <span className="text-zinc-500 text-sm line-through">₹{product.mrp.toLocaleString('en-IN')}</span>
                      <span className="text-green-500 text-sm font-bold">{product.discountPercentage || Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF</span>
                    </>
                  )}
                </div>

                {/* C2M Progress Bar */}
                {product.c2m && product.preOrderTarget > 0 && (
                  <div className="mb-6 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-sm font-bold text-white">{product.currentPreOrders} Orders Placed</span>
                      </div>
                      <span className="text-xs text-zinc-500">Target: {product.preOrderTarget}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.min(100, (product.currentPreOrders / product.preOrderTarget) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 text-center">
                      Only {Math.max(0, product.preOrderTarget - product.currentPreOrders)} more orders needed to start production!
                    </p>
                  </div>
                )}

                {product.deliveryDate && (
                  <div className="flex items-center gap-2 text-sm text-zinc-300 mb-4 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                    <Package className="w-5 h-5 text-purple-400" />
                    <span>Delivery by <span className="font-bold text-white">{product.deliveryDate}</span></span>
                  </div>
                )}

                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, idx) => (
                      <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Color Selection */}
              {product.colors && (
                <section>
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Color: <span className="text-white">{selectedColor}</span></h4>
                  <div className="flex gap-4">
                    {product.colors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.name)}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all p-0.5",
                          selectedColor === color.name ? "border-purple-500 scale-110" : "border-transparent"
                        )}
                      >
                        <div className="w-full h-full rounded-full" style={{ backgroundColor: color.hex }}></div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Size Selection */}
              {product.sizes && (
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Select Size</h4>
                    <button 
                      onClick={() => setShowSizeChart(true)}
                      className="text-xs font-bold text-purple-400 flex items-center gap-1 hover:text-purple-300"
                    >
                      <Ruler className="w-3 h-3" /> Size Guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "w-14 h-14 rounded-2xl border-2 font-bold transition-all flex items-center justify-center",
                          selectedSize === size ? "border-purple-500 bg-purple-500/10 text-white" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Description & Details */}
              <section className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">Product Details</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">{product.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailItem label="Fabric" value={product.fabric || 'Premium Cotton'} />
                  <DetailItem label="Fit" value={product.fit || 'Regular Fit'} />
                  <DetailItem label="Occasion" value={product.occasion || 'Casual / Daily Wear'} />
                  <DetailItem label="Wash Care" value={product.washCare || 'Machine Wash Cold'} />
                </div>

                {product.features && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">Key Features</h4>
                    <ul className="grid grid-cols-2 gap-3">
                      {product.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Shipping & Trust Section */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center shrink-0">
                      <Truck className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">India Post Speed Post</h4>
                      <p className="text-xs text-zinc-500">100% reliable delivery across TN. 1-2 days for cities, 3-4 days for villages.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Bank-Grade Security</h4>
                      <p className="text-xs text-zinc-500">100% secure checkout. Your data is encrypted and safe from hackers.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0">
                      <Send className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Direct Seller Chat</h4>
                      <p className="text-xs text-zinc-500">Order directly via WhatsApp and get real-time Speed Post tracking numbers.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Delivery & Pincode Check */}
              <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Check Delivery
                </h4>
                <form onSubmit={handleCheckPincode} className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Enter Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.slice(0, 6))}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={pincode.length !== 6 || pincodeStatus === 'checking'}
                    className="bg-zinc-800 text-white px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                  >
                    {pincodeStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Check'}
                  </button>
                </form>
                
                {pincodeStatus === 'success' && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-green-500">Delivery available</p>
                      <p className="text-xs text-zinc-400 mt-1">Expected delivery by <span className="text-white font-bold">{deliveryDate}</span></p>
                      {product.c2m && <p className="text-[10px] text-zinc-500 mt-1">*C2M items require manufacturing time</p>}
                    </div>
                  </div>
                )}
                {pincodeStatus === 'error' && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-500">Not serviceable</p>
                      <p className="text-xs text-zinc-400 mt-1">We currently do not deliver to this pincode.</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Trust & Shipping */}
              <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">Free Shipping & Returns</h5>
                    <p className="text-xs text-zinc-500">Delivery in 3-5 business days. 7-day easy return policy.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">100% Authentic</h5>
                    <p className="text-xs text-zinc-500">Direct from brand. Quality guaranteed by NeuCommerce.</p>
                  </div>
                </div>
              </section>

              {/* Customer Reviews */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Customer Reviews ({reviews.length})</h4>
                </div>

                {/* Add Review Form */}
                {user ? (
                  <form onSubmit={handleSubmitReview} className="mb-6 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-zinc-400">Rating:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReviewRating(star)}
                            className="focus:outline-none"
                          >
                            <Star className={cn("w-5 h-5", star <= newReviewRating ? "fill-yellow-500 text-yellow-500" : "text-zinc-600")} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        placeholder="Write a review..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                        disabled={isSubmittingReview}
                      />
                      <button
                        type="submit"
                        disabled={!newReviewText.trim() || isSubmittingReview}
                        className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center min-w-[48px]"
                      >
                        {isSubmittingReview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mb-6 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-center">
                    <p className="text-sm text-zinc-400">Please login to write a review.</p>
                  </div>
                )}

                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">No reviews yet. Be the first to review!</p>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-bold">{review.userName}</span>
                          <div className="flex text-yellow-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("w-3 h-3", i < review.rating ? "fill-current" : "text-zinc-700")} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 italic">"{review.text}"</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-zinc-900 border-t border-zinc-800 flex gap-4">
              <button 
                onClick={handleAddToCart}
                className={cn(
                  "flex-1 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all",
                  addedToCart ? "bg-green-500 text-white" : "bg-zinc-800 text-white hover:bg-zinc-700"
                )}
              >
                {addedToCart ? <><CheckCircle2 className="w-5 h-5" /> Added!</> : <><ShoppingCart className="w-5 h-5" /> Add to Cart</>}
              </button>
              <button 
                onClick={handleOrder}
                className="flex-[1.5] bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-xl shadow-purple-500/20"
              >
                <ShoppingBag className="w-5 h-5" /> Order Now
              </button>
            </div>
          </motion.div>

          {/* Size Chart Modal Overlay */}
          {showSizeChart && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
              <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-8 border border-zinc-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Ruler className="w-5 h-5" /> Size Chart</h3>
                  <button onClick={() => setShowSizeChart(false)}><X className="w-6 h-6 text-zinc-500" /></button>
                </div>
                <div className="space-y-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800">
                        <th className="py-2 text-left">Size</th>
                        <th className="py-2 text-center">Chest (in)</th>
                        <th className="py-2 text-center">Length (in)</th>
                      </tr>
                    </thead>
                    <tbody className="text-zinc-300">
                      <tr className="border-b border-zinc-800/50"><td className="py-3">S</td><td className="py-3 text-center">38</td><td className="py-3 text-center">27</td></tr>
                      <tr className="border-b border-zinc-800/50"><td className="py-3">M</td><td className="py-3 text-center">40</td><td className="py-3 text-center">28</td></tr>
                      <tr className="border-b border-zinc-800/50"><td className="py-3">L</td><td className="py-3 text-center">42</td><td className="py-3 text-center">29</td></tr>
                      <tr className="border-b border-zinc-800/50"><td className="py-3">XL</td><td className="py-3 text-center">44</td><td className="py-3 text-center">30</td></tr>
                    </tbody>
                  </table>
                  <p className="text-[10px] text-zinc-500 mt-4">Note: All measurements are in inches and may vary slightly by ±0.5 inch.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800/50 p-3 rounded-2xl">
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs font-bold text-zinc-200">{value}</p>
    </div>
  );
}
