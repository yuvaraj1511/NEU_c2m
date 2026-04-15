import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlaySquare, Plus, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Trash2 } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';

interface Banner {
  id: string;
  videoUrl?: string;
  imageUrl?: string;
}

const DEFAULT_BANNER: Banner = {
  id: 'default',
  imageUrl: 'https://images.unsplash.com/photo-1552061330-334d27e0c90d?w=1000&q=80' // Vertical knight image to show auto-crop
};

export default function BannerCarousel() {
  const { user } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.email === 'yuvarajs.1511@gmail.com';
  console.log("Is Admin:", isAdmin, "User Email:", user?.email);

  // Form State
  const [mediaType, setMediaType] = useState<'video' | 'image'>('image');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      console.log("Fetched banners:", fetchedBanners);
      setBanners(fetchedBanners.length > 0 ? fetchedBanners : [DEFAULT_BANNER]);
    }, (error) => {
      console.error("Banner snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth;
      
      if (direction === 'right') {
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      } else {
        if (scrollLeft <= 10) {
          scrollRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      }
    }
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      scroll('right');
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setError(null);
    
    if (uploadMethod === 'file' && !mediaFile) {
      setError(`Please select a ${mediaType} file.`);
      return;
    }
    if (uploadMethod === 'url' && !mediaUrl) {
      setError(`Please enter a ${mediaType} URL.`);
      return;
    }

    // File size limits to prevent long uploads
    if (uploadMethod === 'file' && mediaFile) {
      if (mediaType === 'image' && mediaFile.size > 5 * 1024 * 1024) {
        setError('Image file is too large. Please select an image under 5MB.');
        return;
      }
      if (mediaType === 'video' && mediaFile.size > 50 * 1024 * 1024) {
        setError('Video file is too large. Please select a video under 50MB.');
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      let finalVideoUrl = null;
      let finalImageUrl = null;

      if (uploadMethod === 'file' && mediaFile) {
        if (mediaType === 'image') {
          // Use Base64 method for "instant" feel like seller dashboard
          try {
            setUploadProgress(10);
            const base64Image = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(mediaFile);
              reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const aspectRatio = 21/9;
                  let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
                  const currentRatio = img.width / img.height;
                  if (currentRatio > aspectRatio) {
                    sourceWidth = img.height * aspectRatio;
                    sourceX = (img.width - sourceWidth) / 2;
                  } else {
                    sourceHeight = img.width / aspectRatio;
                    sourceY = (img.height - sourceHeight) / 2;
                  }
                  canvas.width = 1200;
                  canvas.height = 1200 / aspectRatio;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
                  resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                img.onerror = reject;
              };
              reader.onerror = reject;
            });
            finalImageUrl = base64Image;
            setUploadProgress(100);
          } catch (err) {
            console.error("Base64 conversion failed:", err);
            alert("Failed to process image.");
            setIsSubmitting(false);
            return;
          }
        } else {
          const fileRef = ref(storage, `banners/${Date.now()}_${mediaFile.name}`);
          const uploadTask = uploadBytesResumable(fileRef, mediaFile);
          const downloadUrl = await new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.max(progress, 1));
              }, 
              (error) => reject(error), 
              () => {
                getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
              }
            );
          });
          finalVideoUrl = downloadUrl;
        }
      } else {
        if (mediaType === 'video') {
          finalVideoUrl = mediaUrl;
        } else {
          finalImageUrl = mediaUrl;
        }
      }

      await addDoc(collection(db, 'banners'), {
        videoUrl: finalVideoUrl,
        imageUrl: finalImageUrl,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setMediaFile(null);
      setMediaUrl('');
    } catch (err) {
      console.error("Error adding banner:", err);
      setError("Failed to add banner. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    console.log("Delete button clicked for ID:", bannerId);
    if (!isAdmin) {
      console.error("Delete failed: Not an admin");
      return;
    }
    if (bannerId === 'default') {
      console.error("Delete failed: Cannot delete default banner");
      return;
    }
    
    try {
      console.log("Attempting to delete banner document:", bannerId);
      await deleteDoc(doc(db, 'banners', bannerId));
      console.log("Banner document deleted successfully");
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert("Failed to delete banner. Check console for details.");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Featured</h3>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Banner
          </button>
        )}
      </div>

      <div className="relative group">
        {banners.length > 1 && (
          <>
            <button 
              onClick={() => scroll('left')}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div 
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 pb-4"
        >
          {banners.map((banner, index) => (
            <div key={banner.id || index} className="min-w-full snap-center shrink-0 relative group/banner">
              <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-zinc-900 rounded-3xl overflow-hidden relative border border-zinc-800 shadow-2xl">
                {banner.videoUrl ? (
                  <video 
                    src={banner.videoUrl} 
                    className="w-full h-full object-cover" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                  />
                ) : (
                  <img 
                    src={banner.imageUrl} 
                    alt="Banner"
                    className="w-full h-full object-cover" 
                  />
                )}
              </div>
              
              {isAdmin && banner.id !== 'default' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBanner(banner.id);
                  }}
                  className="absolute top-4 right-4 z-30 bg-red-500/80 hover:bg-red-500 text-white p-3 rounded-full backdrop-blur-md opacity-0 group-hover/banner:opacity-100 transition-all shadow-lg pointer-events-auto"
                  title="Delete Banner"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Banner Modal */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="font-bold text-lg">Add New Banner</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddBanner} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Media Type</label>
                  <select 
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as 'video' | 'image')}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Source</label>
                  <select 
                    value={uploadMethod}
                    onChange={(e) => setUploadMethod(e.target.value as 'file' | 'url')}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="file">Upload File</option>
                    <option value="url">Paste URL</option>
                  </select>
                </div>
              </div>
              
              <div>
                {uploadMethod === 'file' ? (
                  <>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Upload {mediaType === 'video' ? 'Video' : 'Image'}
                    </label>
                    <input 
                      type="file" 
                      accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                      onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30"
                      required
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      {mediaType === 'video' ? 'Video' : 'Image'} URL
                    </label>
                    <input 
                      type="url" 
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                      placeholder={`https://example.com/${mediaType === 'video' ? 'video.mp4' : 'image.jpg'}`}
                      required
                    />
                  </>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 relative overflow-hidden"
              >
                {isSubmitting && (
                  <div 
                    className="absolute inset-0 bg-white/20 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
                <span className="relative z-10">
                  {isSubmitting ? (
                    uploadProgress < 1 ? 'Compressing...' : `Uploading... ${Math.round(uploadProgress)}%`
                  ) : 'Add Banner'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
