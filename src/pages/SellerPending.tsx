import React from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Clock } from 'lucide-react';

export default function SellerPending() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[3rem] inline-block">
          <Clock className="w-20 h-20 text-orange-500 mx-auto mb-8" />
          <h1 className="text-4xl font-black mb-4">Application Pending</h1>
          <p className="text-zinc-500 max-w-md mx-auto">
            Your seller application is currently under review by our team. 
            We will notify you once your account has been approved.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
