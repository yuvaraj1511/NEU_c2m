import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const LEGAL_CONTENT: Record<string, { title: string; content: React.ReactNode }> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    content: (
      <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
        <p>Last updated: April 2026</p>
        <h3 className="text-white font-bold text-lg mt-6">1. Information We Collect</h3>
        <p>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.</p>
        
        <h3 className="text-white font-bold text-lg mt-6">2. How We Use Your Information</h3>
        <p>We may use the information we collect about you to provide, maintain, and improve our services, including to facilitate payments, send receipts, provide products and services you request.</p>
        
        <h3 className="text-white font-bold text-lg mt-6">3. Sharing of Information</h3>
        <p>We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including with vendors, consultants, marketing partners, and other service providers.</p>
      </div>
    )
  },
  'terms-of-service': {
    title: 'Terms of Service',
    content: (
      <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
        <p>Last updated: April 2026</p>
        <h3 className="text-white font-bold text-lg mt-6">1. Acceptance of Terms</h3>
        <p>By accessing and using our application, you accept and agree to be bound by the terms and provision of this agreement.</p>
        
        <h3 className="text-white font-bold text-lg mt-6">2. Use of Service</h3>
        <p>You agree to use our services only for lawful purposes and in accordance with these Terms. You are responsible for all activities that occur under your account.</p>
        
        <h3 className="text-white font-bold text-lg mt-6">3. C2M Pre-Orders</h3>
        <p>Our Consumer-to-Manufacturer (C2M) items are made to order. Production begins only when the pre-order target is met. If a target is not met within the specified timeframe, a full refund will be issued.</p>
      </div>
    )
  },
  'refund-policy': {
    title: 'Refund & Return Policy',
    content: (
      <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
        <p>Last updated: April 2026</p>
        <h3 className="text-white font-bold text-lg mt-6">1. Standard Returns</h3>
        <p>We accept returns within 7 days of delivery for standard items. Items must be unworn, unwashed, and have original tags attached.</p>
        
        <h3 className="text-white font-bold text-lg mt-6">2. C2M Items</h3>
        <p>Because C2M (Consumer-to-Manufacturer) items are custom-made based on community demand, they are non-refundable unless there is a manufacturing defect or the item arrives damaged.</p>
        
        <h3 className="text-white font-bold text-lg mt-6">3. Refund Process</h3>
        <p>Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. Your refund will be processed, and a credit will automatically be applied to your original method of payment within 5-7 business days.</p>
      </div>
    )
  }
};

export default function LegalPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const pageData = LEGAL_CONTENT[pageId || ''] || {
    title: 'Page Not Found',
    content: <p>The requested legal document could not be found.</p>
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900 p-4 flex items-center gap-4">
        <Link to="/profile" className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{pageData.title}</h1>
      </header>
      
      <main className="max-w-md mx-auto p-6">
        {pageData.content}
      </main>
    </div>
  );
}
