"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, MapPin, Calendar, Clock, Receipt, Users, DollarSign, FileText, Share2, Download, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const fetchReceiptDetail = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/receipts/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch receipt details');
      }

      const data = await response.json();
      setReceipt(data.receipt);
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

    fetchReceiptDetail();
  }, [user, params.id, router]);

  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Receipt: ${receipt?.name}`,
        text: `Receipt from ${receipt?.location_name} - ${formatCurrency(receipt?.nett_amount)}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50">
        <div className="bg-white p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Receipt Not Found</h1>
          </div>
        </div>
        <div className="p-4">
          <div className="text-center py-8">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">Receipt not found</p>
            <p className="text-sm text-gray-500 mb-4">The receipt you&rsquo;re looking for doesn&rsquo;t exist or you don&rsquo;t have access to it.</p>
            <button
              onClick={() => router.back()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.back()}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Receipt Details</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            {receipt.file_url && (
              <a
                href={receipt.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-20">
        {/* Receipt Image */}
        {receipt.file_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl overflow-hidden shadow-sm"
          >
            <img
              src={receipt.file_url}
              alt="Receipt"
              className="w-full h-64 object-cover"
            />
          </motion.div>
        )}

        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Receipt className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{receipt.name || 'Untitled Receipt'}</h2>
              <p className="text-sm text-gray-500">{receipt.category || 'General'}</p>
            </div>
          </div>
          
          {receipt.notes && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                <p className="text-sm text-gray-700">{receipt.notes}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Location & Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 shadow-sm"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Location & Time</h3>
          <div className="space-y-3">
            {(receipt.location_name || receipt.address) && (
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  {receipt.location_name && (
                    <p className="font-medium text-gray-900">{receipt.location_name}</p>
                  )}
                  {receipt.address && (
                    <p className="text-sm text-gray-600">{receipt.address}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <p className="text-sm text-gray-700">{formatDate(receipt.date || receipt.created_at)}</p>
            </div>
            
            {receipt.time && (
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <p className="text-sm text-gray-700">{receipt.time}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Amount Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 shadow-sm"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Amount Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(receipt.subtotal_amount || 0)}</span>
            </div>
            
            {receipt.tax_amount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tax ({(receipt.tax_rate || 0).toFixed(1)}%)</span>
                <span className="font-medium">{formatCurrency(receipt.tax_amount)}</span>
              </div>
            )}
            
            {receipt.service_charge_amount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Service Charge ({(receipt.service_charge_rate || 0).toFixed(1)}%)</span>
                <span className="font-medium">{formatCurrency(receipt.service_charge_amount)}</span>
              </div>
            )}
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                <span className="text-lg font-bold text-purple-600">{formatCurrency(receipt.nett_amount)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Items List */}
        {receipt.items && receipt.items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Items ({receipt.items.length})</h3>
            <div className="space-y-2">
              {receipt.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                      {item.item_id}
                    </div>
                    <span className="text-sm text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Participants & Split Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-4 shadow-sm"
        >
          <h3 className="font-semibold text-gray-900 mb-3">
            Split Information ({receipt.participants?.length || 0} participants)
          </h3>
          
          {/* Split Method */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Split Method:</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {receipt.split_method || 'Equal'}
              </span>
            </div>
          </div>

          {/* Your Share Highlight */}
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Your Share</span>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {formatCurrency(receipt.current_user_share || 0)}
              </span>
            </div>
          </div>

          {/* All Participants */}
          {receipt.participants && receipt.participants.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">All Participants:</h4>
              {receipt.participants.map((participant, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                  participant.user_id === user.id 
                    ? 'bg-purple-50 border-purple-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      participant.user_id === user.id 
                        ? 'bg-purple-100' 
                        : 'bg-gray-100'
                    }`}>
                      <User className={`w-4 h-4 ${
                        participant.user_id === user.id 
                          ? 'text-purple-600' 
                          : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {participant.name}
                        {participant.user_id === user.id && (
                          <span className="ml-2 text-xs text-purple-600 font-medium">(You)</span>
                        )}
                      </p>
                      {participant.email && (
                        <p className="text-xs text-gray-500">{participant.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      participant.user_id === user.id 
                        ? 'text-purple-600' 
                        : 'text-gray-700'
                    }`}>
                      {formatCurrency(participant.total_paid)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bill Owner Info */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-900">
                <span className="font-medium">Bill paid by:</span> {
                  receipt.paid_by === user.id ? 'You' : 
                  receipt.participants?.find(p => p.user_id === receipt.paid_by)?.name || 'Unknown'
                }
              </span>
            </div>
          </div>
        </motion.div>

        {/* Current User's Item Breakdown */}
        {receipt.current_user_breakdown && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Your Item Breakdown</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(receipt.current_user_breakdown, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}