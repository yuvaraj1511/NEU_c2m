import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, setDoc, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { Users, Play, Youtube, Instagram, Facebook, CheckCircle, Info, Send, Video, Plus, X, RefreshCw, Image as ImageIcon, Trash2, MessageSquare, Heart, UserPlus, Search, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClanMember {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
  platform: string;
  stats: {
    subscribers: number;
    views: number;
  };
  status: string;
}

interface ClanPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string; // New field for leader photo
  videoUrl: string; // Keep for compatibility
  thumbnailUrl: string; // Keep for compatibility
  imageUrls?: string[]; // New field for multiple images
  description: string;
  productName?: string;
  price?: number;
  mrp?: number;
  category?: string;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  status?: 'live' | 'uploading' | 'error';
  progress?: number;
  createdAt: any;
}

export default function ClanPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [posts, setPosts] = useState<ClanPost[]>([]);
  const [clanSettings, setClanSettings] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<ClanMember | null>(null);
  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({});
  const [isFollowing, setIsFollowing] = useState<Record<string, boolean>>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [postData, setPostData] = useState({
    description: '',
    hashtags: '',
    productName: '',
    price: '',
    mrp: '',
    colors: '',
    sizes: '',
    fabric: '',
    fit: '',
    occasion: '',
    washCare: '',
    features: '',
    imageFiles: [] as File[],
    postType: 'image' as 'image',
    category: 'Trending'
  });
  const [currentLeaderIndex, setCurrentLeaderIndex] = useState(0);
  const [applicationData, setApplicationData] = useState({
    platform: 'youtube',
    handle: '',
    subscribers: '',
    views: ''
  });
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const isAdmin = user?.email === 'yuvarajs.1511@gmail.com';
  const isApprovedLeader = members.some(m => m.userId === user?.uid && m.status === 'approved');
  const isActiveSeller = sellerProfile?.status === 'active';
  const canPost = isAdmin || isApprovedLeader;

  useEffect(() => {
    if (members.length > 0) {
      const interval = setInterval(() => {
        setCurrentLeaderIndex((prev) => (prev + 1) % members.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [members]);

  useEffect(() => {
    if (!user) return;
    console.log("Current User:", user?.email, "UID:", user?.uid, "isAdmin:", isAdmin);

    // Fetch seller profile
    const unsubSeller = onSnapshot(doc(db, 'sellers', user.uid), (doc) => {
        if (doc.exists()) {
            setSellerProfile(doc.data());
        }
    }, (error) => {
      console.error("Seller profile snapshot error:", error);
    });

    // Fetch approved members
    const membersQ = query(collection(db, 'clan_members'), where('status', '==', 'approved'));
    const unsubscribeMembers = onSnapshot(membersQ, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClanMember)));
    }, (error) => {
      console.error("Clan members snapshot error:", error);
    });

    // Fetch posts
    const postsQ = query(collection(db, 'clan_posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(postsQ, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClanPost)));
    }, (error) => {
      console.error("Clan posts snapshot error:", error);
    });

    // Fetch follow counts and status
    const unsubFollows = onSnapshot(collection(db, 'clan_follows'), (snapshot) => {
      const counts: Record<string, number> = {};
      const following: Record<string, boolean> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        counts[data.leaderId] = (counts[data.leaderId] || 0) + 1;
        if (user && data.followerId === user.uid) {
          following[data.leaderId] = true;
        }
      });
      
      setFollowCounts(counts);
      setIsFollowing(following);
    }, (error) => {
      console.error("Clan follows snapshot error:", error);
    });

    // Fetch clan settings (banner etc)
    const unsubSettings = onSnapshot(doc(db, 'clan_settings', 'hero'), (doc) => {
      if (doc.exists()) {
        setClanSettings(doc.data());
      }
    }, (error) => {
      console.error("Clan settings snapshot error:", error);
    });

    return () => {
      unsubSeller();
      unsubscribeMembers();
      unsubscribePosts();
      unsubFollows();
      unsubSettings();
    };
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const leaderId = params.get('leaderId');
    if (leaderId && members.length > 0) {
      const leader = members.find(m => m.userId === leaderId);
      if (leader) {
        setSelectedLeader(leader);
      }
    }
  }, [location.search, members]);

  useEffect(() => {
    if (isEditingProfile && user) {
      const currentMember = members.find(m => m.userId === user.uid);
      if (currentMember) {
        setEditUsername(currentMember.displayName);
      }
    }
  }, [isEditingProfile, user, members]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 16) { // 16 to allow a small buffer for 15s videos
          alert("Video must be 15 seconds or less.");
          setPostData({ ...postData, videoFile: null });
        } else {
          setPostData({ ...postData, videoFile: file });
        }
      };
      video.src = URL.createObjectURL(file);
    } else {
      setPostData({ ...postData, videoFile: null });
    }
  };

  const handleDeletePost = async (postId: string) => {
    // window.confirm is often blocked in iframes, so we'll proceed directly or use a custom UI
    // For now, let's log and attempt deletion directly to verify the logic works
    console.log("Attempting to delete post:", postId);
    try {
      await deleteDoc(doc(db, 'clan_posts', postId));
      console.log("Post deleted successfully:", postId);
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. Please check console for details.");
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canPost) {
      alert("Please ensure you are logged in and authorized.");
      return;
    }

    if (postData.imageFiles.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    const price = parseFloat(postData.price);
    const mrp = parseFloat(postData.mrp);

    if (isNaN(price) || isNaN(mrp)) {
      alert("Please enter valid numbers for Price and MRP.");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(10);
    setIsCreatingPost(false);

    try {
      const currentMember = members.find(m => m.userId === user.uid);
      const authorName = currentMember?.displayName || user.displayName || user.email?.split('@')[0] || 'Clan Leader';
      const authorPhoto = currentMember?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;

      // Process all images
      const imageUrls: string[] = [];
      const totalImages = postData.imageFiles.length;

      for (let i = 0; i < totalImages; i++) {
        const file = postData.imageFiles[i];
        const base64 = await new Promise<string>((resolve, reject) => {
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
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
          };
          reader.onerror = reject;
        });
        imageUrls.push(base64);
        setUploadProgress(10 + ((i + 1) / totalImages) * 80);
      }

      // Create the Firestore document
      await addDoc(collection(db, 'clan_posts'), {
        authorId: user.uid,
        authorName: authorName,
        authorPhoto: authorPhoto,
        description: postData.description,
        productName: postData.productName || 'Exclusive Product',
        price: price,
        mrp: mrp,
        category: postData.category,
        videoUrl: imageUrls[0], // Primary image
        thumbnailUrl: imageUrls[0],
        imageUrls: imageUrls,
        sizes: postData.sizes.split(',').map(s => s.trim()).filter(s => s),
        colors: postData.colors.split(',').map(c => ({ name: c.trim(), hex: '#808080' })).filter(c => c.name),
        status: 'live',
        progress: 100,
        type: 'image',
        views: 0,
        createdAt: serverTimestamp()
      });

      setUploadProgress(100);
      setTimeout(() => setIsUploading(false), 1000);
      setPostData({ 
        description: '', hashtags: '', productName: '', price: '', mrp: '', colors: '', sizes: '', fabric: '', fit: '', occasion: '', washCare: '', features: '', imageFiles: [], postType: 'image', category: 'Trending' 
      });
      alert("Post created successfully!");
    } catch (error) {
      console.error("Post creation failed:", error);
      alert("Error: " + (error instanceof Error ? error.message : "Unknown error"));
      setIsUploading(false);
    }
  };

  const handleUpdateBanner = async () => {
    if (!bannerFile || !isAdmin) return;
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(bannerFile);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const aspectRatio = 16/9;
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
      
      await setDoc(doc(db, 'clan_settings', 'hero'), {
        bannerUrl: base64Image,
        updatedAt: serverTimestamp()
      });
      setIsEditingBanner(false);
      setBannerFile(null);
      alert("Clan banner updated successfully!");
    } catch (error) {
      console.error("Error updating banner:", error);
      alert("Failed to update banner.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    const currentMember = members.find(m => m.userId === user.uid);
    if (!currentMember) {
      alert("You are not a registered Clan Member.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    try {
      let photoURL = currentMember.photoURL;
      
      if (profilePhotoFile) {
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(profilePhotoFile);
          reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const size = Math.min(img.width, img.height);
              canvas.width = 400;
              canvas.height = 400;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(
                img, 
                (img.width - size) / 2, (img.height - size) / 2, size, size,
                0, 0, 400, 400
              );
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
          };
          reader.onerror = reject;
        });
        photoURL = base64Image;
      }

      await updateDoc(doc(db, 'clan_members', currentMember.id), {
        photoURL: photoURL,
        displayName: editUsername || currentMember.displayName,
        updatedAt: serverTimestamp()
      });
      
      setIsEditingProfile(false);
      setProfilePhotoFile(null);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setApplicationStatus('submitting');
    try {
      await setDoc(doc(db, 'clan_members', user.uid), {
        userId: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || '',
        platform: applicationData.platform,
        stats: {
          subscribers: parseInt(applicationData.subscribers),
          views: parseInt(applicationData.views)
        },
        status: 'pending',
        handle: applicationData.handle,
        createdAt: serverTimestamp()
      });
      setApplicationStatus('success');
      setTimeout(() => {
        setIsApplying(false);
        setApplicationStatus('idle');
      }, 3000);
    } catch (error) {
      console.error("Error applying for Clan X:", error);
      setApplicationStatus('idle');
    }
  };

  const handleFollow = async (leaderId: string) => {
    if (!user) {
      alert("Please login to follow creators.");
      return;
    }
    
    const followId = `${user.uid}_${leaderId}`;
    try {
      if (isFollowing[leaderId]) {
        await deleteDoc(doc(db, 'clan_follows', followId));
      } else {
        await setDoc(doc(db, 'clan_follows', followId), {
          followerId: user.uid,
          leaderId: leaderId,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error following:", error);
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
        createdAt: serverTimestamp(),
        read: false
      });
      setMessageText('');
      setIsMessaging(false);
      alert("Message sent privately!");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    // window.confirm can be tricky in iframes, so we'll use a simple alert-based confirmation or just proceed
    // The user reported it's not working, so let's log and ensure the ID is correct
    console.log("Attempting to remove clan member:", memberId);
    try {
      await deleteDoc(doc(db, 'clan_members', memberId));
      console.log("Clan member removed successfully");
      alert("Member removed successfully.");
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member. Check console.");
    }
  };

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      <Header />

      {/* Hero Section */}
      <div className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-black z-10"></div>
        <img 
          src={clanSettings?.bannerUrl || "https://picsum.photos/seed/clan/1920/1080?blur=10"} 
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          alt="Clan Background"
          referrerPolicy="no-referrer"
        />
        
        {isAdmin && (
          <button 
            onClick={() => setIsEditingBanner(true)}
            className="absolute top-24 right-4 z-20 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/20 hover:bg-purple-600 transition-all"
          >
            <ImageIcon className="w-5 h-5 text-white" />
          </button>
        )}

        <div className="relative z-20 text-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 px-4 py-1 rounded-full text-purple-400 text-sm font-bold mb-4"
          >
            <Users className="w-4 h-4" /> CLAN X EXCLUSIVE
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6"
          >
            THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">CLAN X</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            Join the elite circle of creators. Post exclusive content, lead trends, and get early access to C2M pre-orders.
          </motion.p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-12">
        {/* Clan Members Horizontal Scroll */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-500" /> Clan Leaders
            </h2>
            <div className="relative max-w-md w-full">
              <input 
                type="text" 
                placeholder="Search Clan Leaders..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-purple-500 transition-all text-sm"
              />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            </div>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
            {filteredMembers.length === 0 ? (
              <div className="text-zinc-500 italic">No Clan Leaders found matching your search.</div>
            ) : (
              filteredMembers.map((member) => (
                <div 
                  key={member.id} 
                  onClick={() => setSelectedLeader(member)}
                  className="flex-shrink-0 w-48 text-center group cursor-pointer"
                >
                  <div className="relative mb-4">
                    <div className="w-32 h-32 mx-auto rounded-full p-1 bg-gradient-to-tr from-purple-500 to-pink-500 group-hover:scale-105 transition-transform">
                      <div className="w-full h-full rounded-full bg-zinc-900 p-1">
                        <img 
                          src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.displayName}`} 
                          className="w-full h-full rounded-full object-cover"
                          alt={member.displayName}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <div className="absolute bottom-1 right-10 bg-zinc-900 rounded-full p-1 border border-zinc-800">
                      {member.platform === 'youtube' && <Youtube className="w-4 h-4 text-red-500" />}
                      {member.platform === 'instagram' && <Instagram className="w-4 h-4 text-pink-500" />}
                      {member.platform === 'facebook' && <Facebook className="w-4 h-4 text-blue-500" />}
                    </div>
                  </div>
                  <h4 className="font-bold text-zinc-200 group-hover:text-purple-400 transition-colors">{member.displayName}</h4>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{member.platform} Creator</p>
                  
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMember(member.id);
                      }}
                      className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-tighter"
                    >
                      Remove Member
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

          <div className="grid grid-cols-1 gap-12">
            {/* Clan Posts Feed */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <ImageIcon className="w-6 h-6 text-pink-500" /> Exclusive Feed
                </h2>
                <div className="flex items-center gap-3">
                  {members.length > 0 && (
                    <motion.div 
                      key={currentLeaderIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-500/50">
                        <img 
                          src={members[currentLeaderIndex].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${members[currentLeaderIndex].displayName}`} 
                          className="w-full h-full object-cover"
                          alt="Leader"
                        />
                      </div>
                      <span className="text-xs font-bold text-purple-400">@{members[currentLeaderIndex].displayName}</span>
                      <span className="text-[10px] text-zinc-500 uppercase">Suggested</span>
                    </motion.div>
                  )}
                  {isAdmin && (
                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full uppercase tracking-tighter border border-purple-500/30">
                      Admin Mode Active
                    </span>
                  )}
                </div>
              </div>
            <div className="flex items-center gap-4">
              {canPost && (
                <button 
                  onClick={() => setIsCreatingPost(true)}
                  className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Create New Post
                </button>
              )}
              {isApprovedLeader && (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 text-purple-400"
                >
                  <ImageIcon className="w-5 h-5" /> Edit Profile
                </button>
              )}
              <button 
                onClick={() => window.location.reload()}
                className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 text-zinc-400"
                title="Refresh Feed"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            
            {posts.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl p-20 text-center">
                <Play className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500">The feed is empty. Only Clan X members can post here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {/* Real Posts */}
                {posts.map((post) => (
                  <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-purple-500/50 transition-all relative">
                    <div className="relative aspect-video bg-zinc-800">
                      <img 
                        src={post.thumbnailUrl || `https://picsum.photos/seed/${post.id}/800/450`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        alt={post.description}
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Delete Button (Visible to all logged in users for debugging, Firestore handles security) */}
                      {user && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post.id);
                          }}
                          className="absolute top-3 right-3 w-10 h-10 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center transition-all z-20 group/del"
                        >
                          <Trash2 className="w-5 h-5 text-white group-hover/del:scale-110 transition-transform" />
                        </button>
                      )}

                      {/* Uploading Overlay */}
                      {post.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                          <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-2" />
                          <span className="text-xs font-bold text-white uppercase tracking-widest">Posting... {post.progress}%</span>
                          <div className="w-full max-w-[120px] h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all duration-300" 
                              style={{ width: `${post.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error Overlay */}
                      {post.status === 'error' && (
                        <div className="absolute inset-0 bg-red-500/20 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                          <Info className="w-8 h-8 text-red-500 mb-2" />
                          <span className="text-xs font-bold text-white uppercase">Upload Failed</span>
                          {post.errorMsg && <p className="text-[10px] text-red-300 mt-1 line-clamp-2">{post.errorMsg}</p>}
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            className="mt-3 text-[10px] bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-white transition-colors"
                          >
                            Remove & Retry
                          </button>
                        </div>
                      )}

                      {post.status !== 'uploading' && post.status !== 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                            {post.type === 'image' ? (
                              <ImageIcon className="w-6 h-6 text-black" />
                            ) : (
                              <Play className="w-6 h-6 text-black fill-current" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div 
                          onClick={() => {
                            const leader = members.find(m => m.userId === post.authorId);
                            if (leader) setSelectedLeader(leader);
                          }}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden group-hover:border-purple-500 transition-colors">
                            <img 
                              src={post.authorPhoto || members.find(m => m.userId === post.authorId)?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorName}`} 
                              className="w-full h-full object-cover"
                              alt="Author"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-purple-400 transition-colors">@{post.authorName}</span>
                            <span className="text-[10px] text-zinc-500">Clan X Leader</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle follow logic
                          }}
                          className="text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-widest px-3 py-1 rounded-full border border-purple-500/30 hover:bg-purple-500/10 transition-all"
                        >
                          Follow
                        </button>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{post.description}</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
                        <div className="text-[10px] font-bold px-2 py-1 rounded tracking-wider uppercase bg-pink-600 text-white">
                          Clan X Exclusive
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
                          <Eye className="w-3 h-3" /> {post.views || 0}
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-2">
                        {post.hashtags?.map((tag: string, i: number) => (
                          <span key={i} className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer">#{tag}</span>
                        ))}
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs font-bold text-white bg-purple-600/20 px-2 py-1 rounded border border-purple-500/30">
                          ₹{post.price?.toLocaleString('en-IN')}
                        </div>
                        <button 
                          onClick={() => navigate(`/c2m`)}
                          className="text-[10px] font-black uppercase tracking-widest text-white bg-purple-600 px-4 py-2 rounded-xl hover:bg-purple-500 transition-all"
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit Banner Modal */}
        <AnimatePresence>
          {isEditingBanner && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900 w-full max-w-md rounded-3xl p-8 border border-zinc-800"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Update Clan Banner</h3>
                  <button onClick={() => setIsEditingBanner(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="space-y-6">
                  <div className="aspect-video bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden">
                    {bannerFile ? (
                      <img src={URL.createObjectURL(bannerFile)} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <>
                        <ImageIcon className="w-12 h-12 text-zinc-700 mb-2" />
                        <p className="text-zinc-500 text-sm">Select a new banner image</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <button onClick={() => setIsEditingBanner(false)} className="flex-1 bg-zinc-800 py-3 rounded-xl font-bold">Cancel</button>
                    <button 
                      onClick={handleUpdateBanner} 
                      disabled={!bannerFile || isUploading} 
                      className="flex-1 bg-purple-600 py-3 rounded-xl font-bold disabled:opacity-50 relative overflow-hidden"
                    >
                      {isUploading && (
                        <div className="absolute inset-0 bg-white/20" style={{ width: `${uploadProgress}%` }} />
                      )}
                      <span className="relative z-10">
                        {isUploading ? `Updating... ${Math.round(uploadProgress)}%` : 'Update'}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Post Modal */}
          {isCreatingPost && (
            <div className="fixed inset-0 bottom-16 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-zinc-900 w-full max-w-lg rounded-[2.5rem] p-8 border border-zinc-800 max-h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Create New Post</h3>
                  <button onClick={() => setIsCreatingPost(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleCreatePost} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Product Name</label>
                    <input 
                      placeholder="e.g. Oversized Purple Tee"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 outline-none focus:border-purple-500"
                      value={postData.productName}
                      onChange={e => setPostData({...postData, productName: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Price (₹)</label>
                      <input 
                        placeholder="2499"
                        type="number"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 outline-none focus:border-purple-500"
                        value={postData.price}
                        onChange={e => setPostData({...postData, price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">MRP (₹)</label>
                      <input 
                        placeholder="4999"
                        type="number"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 outline-none focus:border-purple-500"
                        value={postData.mrp}
                        onChange={e => setPostData({...postData, mrp: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Category</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 outline-none focus:border-purple-500"
                      value={postData.category}
                      onChange={e => setPostData({...postData, category: e.target.value})}
                    >
                      <option value="Trending">Trending</option>
                      <option value="Mens">Mens</option>
                      <option value="Womens">Womens</option>
                      <option value="Kids">Kids</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Sizes (Comma separated)</label>
                      <input 
                        placeholder="S, M, L, XL"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 outline-none focus:border-purple-500"
                        value={postData.sizes}
                        onChange={e => setPostData({...postData, sizes: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Colors (Comma separated)</label>
                      <input 
                        placeholder="Black, White, Blue"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 outline-none focus:border-purple-500"
                        value={postData.colors}
                        onChange={e => setPostData({...postData, colors: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                      Image Content (Up to 4 images)
                    </label>
                    <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-purple-500 transition-colors bg-zinc-950/50">
                      <input 
                        type="file" 
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(0, 4);
                          setPostData({...postData, imageFiles: files});
                        }}
                        className="hidden"
                        id="media-upload"
                      />
                      <label htmlFor="media-upload" className="cursor-pointer flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                          <ImageIcon className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-bold text-zinc-300 block">
                            {postData.imageFiles.length > 0 ? `${postData.imageFiles.length} images selected` : 'Select Up to 4 High Quality Images'}
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                              JPG, PNG up to 10MB each
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                  {postData.imageFiles.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {postData.imageFiles.map((file, idx) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-zinc-800">
                          <img 
                            src={URL.createObjectURL(file)} 
                            className="w-full h-full object-cover"
                            alt={`Preview ${idx + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsCreatingPost(false)} disabled={isUploading} className="flex-1 bg-zinc-800 py-3 rounded-xl font-bold disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={isUploading} className="flex-1 bg-purple-600 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden">
                      {isUploading && (
                        <div 
                          className="absolute inset-0 bg-white/20 transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {isUploading ? (
                          uploadProgress < 1 ? <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</> : <><RefreshCw className="w-5 h-5 animate-spin" /> Posting {Math.round(uploadProgress)}%</>
                        ) : (
                          <>
                            Post 
                            {postData.imageFiles.length > 0 && (
                              <span className="text-[10px] opacity-70">
                                ({postData.imageFiles.length} images)
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Become a Clan Leader Section */}
          <div className="space-y-6">
            {/* Profile Edit Modal */}
            <AnimatePresence>
              {isEditingProfile && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsEditingProfile(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  ></motion.div>
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
                  >
                    <h3 className="text-xl font-bold mb-6">Update Profile</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Username</label>
                        <input 
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 outline-none focus:border-purple-500 text-white"
                          placeholder="Enter your username"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Profile Photo</label>
                        <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center hover:border-purple-500 transition-colors bg-zinc-950/50">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="profile-upload"
                          />
                          <label htmlFor="profile-upload" className="cursor-pointer flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 overflow-hidden">
                              {profilePhotoFile ? (
                                <img src={URL.createObjectURL(profilePhotoFile)} className="w-full h-full object-cover" alt="Preview" />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-purple-500" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <span className="text-sm font-bold text-zinc-300 block">
                                {profilePhotoFile ? profilePhotoFile.name : 'Change Profile Photo'}
                              </span>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">JPG, PNG up to 5MB</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={() => setIsEditingProfile(false)}
                          className="flex-1 bg-zinc-800 py-3 rounded-xl font-bold"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleUpdateProfile}
                          disabled={isUploading}
                          className="flex-1 bg-purple-600 py-3 rounded-xl font-bold disabled:opacity-50"
                        >
                          {isUploading ? 'Updating...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 sticky top-24">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                Join <span className="text-purple-400">Clan X</span>
              </h3>
              
              <div className="space-y-6 mb-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm mb-1">Eligibility Rules</h5>
                    <p className="text-xs text-zinc-500 leading-relaxed">To become a Clan Leader, you must meet one of the following criteria:</p>
                  </div>
                </div>

                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Youtube className="w-4 h-4 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">YouTube</p>
                      <p className="text-[10px] text-zinc-500">10K+ Subscribers & 100K+ Total Views</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Instagram className="w-4 h-4 text-pink-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">Instagram</p>
                      <p className="text-[10px] text-zinc-500">5K+ Followers & High Engagement</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Facebook className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">Facebook</p>
                      <p className="text-[10px] text-zinc-500">Influential Page with 20K+ Likes</p>
                    </div>
                  </li>
                </ul>
              </div>

              {applicationStatus === 'success' ? (
                <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-xl text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <h4 className="font-bold text-green-500">Application Sent!</h4>
                  <p className="text-xs text-green-500/80">We will review your stats and get back to you.</p>
                </div>
              ) : isApplying ? (
                <form onSubmit={handleApply} className="space-y-4">
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-purple-500"
                    value={applicationData.platform}
                    onChange={e => setApplicationData({...applicationData, platform: e.target.value})}
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                  <input 
                    placeholder="Channel Handle / Profile URL"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-purple-500"
                    required
                    value={applicationData.handle}
                    onChange={e => setApplicationData({...applicationData, handle: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder="Subscribers"
                      type="number"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-purple-500"
                      required
                      value={applicationData.subscribers}
                      onChange={e => setApplicationData({...applicationData, subscribers: e.target.value})}
                    />
                    <input 
                      placeholder="Total Views"
                      type="number"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-purple-500"
                      required
                      value={applicationData.views}
                      onChange={e => setApplicationData({...applicationData, views: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsApplying(false)}
                      className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={applicationStatus === 'submitting'}
                      className="flex-[2] bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                    >
                      {applicationStatus === 'submitting' ? 'Sending...' : <><Send className="w-4 h-4" /> Submit</>}
                    </button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => user ? setIsApplying(true) : alert('Please login to apply')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  Apply to Join Clan X
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clan Leader Profile Modal */}
        <AnimatePresence>
          {selectedLeader && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setSelectedLeader(null);
                  setIsMessaging(false);
                }}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              ></motion.div>
              
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-zinc-950 border border-purple-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-purple-500/10"
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
                              <ImageIcon className="w-3 h-3 fill-white" /> View
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

        <BottomNav />
      </div>
    </div>
  );
}
