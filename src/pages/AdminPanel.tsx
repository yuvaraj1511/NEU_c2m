import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { 
  Users, Store, ShieldCheck, AlertCircle, CheckCircle2, XCircle, 
  BarChart3, DollarSign, ArrowUpRight, Search, Filter, Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Seller {
  uid: string;
  shopName: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  commissionRate: number;
  totalEarnings: number;
  pendingPayouts: number;
  createdAt: any;
}

interface ClanMember {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sellers' | 'payouts' | 'commissions' | 'clan'>('sellers');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is admin (based on email or role)
  const isAdmin = user?.email === 'yuvarajs.1511@gmail.com';

  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const unsubSellers = onSnapshot(collection(db, 'sellers'), (snapshot) => {
      setSellers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as Seller)));
      setLoading(false);
    }, (error) => {
      console.error("Admin sellers snapshot error:", error);
      setLoading(false);
    });

    const unsubClan = onSnapshot(collection(db, 'clan_members'), (snapshot) => {
      setClanMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClanMember)));
    }, (error) => {
      console.error("Admin clan members snapshot error:", error);
    });

    return () => { unsubSellers(); unsubClan(); };
  }, [isAdmin]);

  const handleUpdateClanStatus = async (memberId: string, status: ClanMember['status']) => {
    try {
      await updateDoc(doc(db, 'clan_members', memberId), {
        status,
        updatedAt: serverTimestamp()
      });
      alert(`Clan member status updated to ${status}`);
    } catch (error) {
      console.error("Error updating clan member status:", error);
      alert("Failed to update status.");
    }
  };

  const handleUpdateStatus = async (sellerId: string, status: Seller['status']) => {
    try {
      await updateDoc(doc(db, 'sellers', sellerId), {
        status,
        updatedAt: serverTimestamp()
      });
      alert(`Seller status updated to ${status}`);
    } catch (error) {
      console.error("Error updating seller status:", error);
      alert("Failed to update status.");
    }
  };

  const handleUpdateCommission = async (sellerId: string, rate: number) => {
    try {
      await updateDoc(doc(db, 'sellers', sellerId), {
        commissionRate: rate,
        updatedAt: serverTimestamp()
      });
      alert("Commission rate updated.");
    } catch (error) {
      console.error("Error updating commission:", error);
    }
  };

  const handleDeleteSeller = async (sellerId: string) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY remove this seller?")) return;
    try {
      await deleteDoc(doc(db, 'sellers', sellerId));
      alert("Seller removed.");
    } catch (error) {
      console.error("Error deleting seller:", error);
    }
  };

  const handleDeleteClanMember = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY remove this clan member?")) return;
    try {
      await deleteDoc(doc(db, 'clan_members', memberId));
      alert("Clan member removed.");
    } catch (error) {
      console.error("Error deleting clan member:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const filteredSellers = sellers.filter(s => 
    s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <Header />
      
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tight mb-2">Admin Panel</h1>
            <p className="text-zinc-500">Manage sellers, commissions, and platform settlements.</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl min-w-[200px]">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Total Sellers</p>
              <p className="text-3xl font-black">{sellers.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl min-w-[200px]">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Apps</p>
              <p className="text-3xl font-black text-orange-500">{sellers.filter(s => s.status === 'pending').length}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 mb-8 w-fit">
          {[
            { id: 'sellers', label: 'Sellers', icon: <Store className="w-4 h-4" /> },
            { id: 'payouts', label: 'Payout Requests', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'commissions', label: 'Commissions', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'clan', label: 'Clan Apps', icon: <Users className="w-4 h-4" /> },
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

        {activeTab === 'clan' && (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">User ID</th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {clanMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-8 py-6 font-mono text-sm">{member.userId}</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-3 py-1 rounded-full border",
                        member.status === 'approved' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        member.status === 'pending' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {member.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleUpdateClanStatus(member.id, 'approved')}
                              className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all"
                              title="Accept"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleUpdateClanStatus(member.id, 'rejected')}
                              className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleDeleteClanMember(member.id)}
                          className="p-2 bg-zinc-800 text-zinc-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                          title="Remove Permanently"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clanMembers.length === 0 && (
              <div className="text-center py-20 text-zinc-500">No clan applications found.</div>
            )}
          </div>
        )}

        {activeTab === 'sellers' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search sellers by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-purple-500 transition-all"
                />
              </div>
              <button className="bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-2xl flex items-center gap-2 font-bold hover:bg-zinc-800 transition-all">
                <Filter className="w-5 h-5" /> Filter
              </button>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-900/50 border-b border-zinc-800">
                  <tr>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Seller / Shop</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Contact</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Commission</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredSellers.map((seller) => (
                    <tr key={seller.uid} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-purple-500">
                            {seller.shopName[0]}
                          </div>
                          <div>
                            <p className="font-bold">{seller.shopName}</p>
                            <p className="text-xs text-zinc-500">ID: {seller.uid.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm">{seller.email}</p>
                        <p className="text-xs text-zinc-500">{seller.phone}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "text-[10px] font-black uppercase px-3 py-1 rounded-full border",
                          seller.status === 'active' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          seller.status === 'pending' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {seller.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            value={seller.commissionRate || 10}
                            onChange={(e) => handleUpdateCommission(seller.uid, parseFloat(e.target.value))}
                            className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-sm text-center"
                          />
                          <span className="text-sm text-zinc-500">%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          {seller.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleUpdateStatus(seller.uid, 'active')}
                                className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(seller.uid, 'rejected')}
                                className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {seller.status === 'active' && (
                            <button 
                              onClick={() => handleUpdateStatus(seller.uid, 'suspended')}
                              className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                              title="Suspend"
                            >
                              <AlertCircle className="w-5 h-5" />
                            </button>
                          )}
                          {seller.status === 'suspended' && (
                            <button 
                              onClick={() => handleUpdateStatus(seller.uid, 'active')}
                              className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-green-500 hover:text-white transition-all"
                              title="Activate"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteSeller(seller.uid)}
                            className="p-2 bg-zinc-800 text-zinc-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                            title="Remove Permanently"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSellers.length === 0 && (
                <div className="text-center py-20 text-zinc-500">No sellers found.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="text-center py-32 bg-zinc-900/20 border border-zinc-800 border-dashed rounded-[3rem]">
            <DollarSign className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-2">No Payout Requests</h3>
            <p className="text-zinc-500">When sellers request payouts, they will appear here.</p>
          </div>
        )}

        {activeTab === 'commissions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[3rem]">
              <h3 className="text-2xl font-bold mb-6">Global Commission Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Default Commission Rate (%)</label>
                  <div className="flex gap-4">
                    <input 
                      type="number"
                      defaultValue={10}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 outline-none focus:border-purple-500"
                    />
                    <button className="bg-white text-black font-black px-8 py-4 rounded-2xl">Save</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
