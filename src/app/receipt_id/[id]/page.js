"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchReceiptDetail } from '@/services/receiptService';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Receipt, Users, DollarSign, FileText, Share2, Download, User, Percent, ForkKnife } from 'lucide-react';
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
  const [userShare, setUserShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleFetchReceiptDetail = async () => {
      if (!params.id) {
        setError('Receipt ID is missing');
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching receipt in handleFetchReceiptDetail()")
        setLoading(true);
        setError(null);

        const data = await fetchReceiptDetail(params.id);
        setReceipt(data.receipt);
        setUserShare(data.userShare);
      } catch (err) {
        console.error('Error fetching receipt:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    handleFetchReceiptDetail();
  }, [params.id]);


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
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 border-l border-r border-gray-100">
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
      <div className="max-w-md mx-auto bg-gray-50">
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
    <div className="max-w-md mx-auto min-h-screen border-l border-r border-gray-100 ">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10">
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

      <div className={`rounded-b-2xl p-4 bg-white shadow-bottom-sm transition-all duration-200 `}>        <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <div className="rounded-lg flex p-1">
              <ForkKnife className="w-4 h-4 text-purple-500 stroke-2 fill-purple-300" />
            </div>
            <h4 className="text-gray-900 text-base font-medium pr-2">{receipt.name || 'Untitled Receipt'}</h4>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
            <div className="flex items-center space-x-6">
              <div className="flex flex-row items-center gap-1 pr-3">
                <span className="text-lg">📍</span>
                <span className="text-xs text-gray-400/80">{receipt.address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
            <div className="flex items-center w-full space-x-6">
              <div className="flex flex-row w-full items-center mt-3 gap-3 justify-between">
                <div></div>
                <div>
                  <div className='flex gap-3 items-center'>
                    <span className='rounded-2xl px-2 py-1.5 bg-gray-100 text-xs '>{receipt?.category || "Unavailable category"}</span>
                    <span className="text-xs">{formatDate(receipt.created_at)}</span>
                    <span className="text-xs">{receipt.time}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className='flex flex-row justify-between mt-3'>

          <div className='flex flex-col text-purple-500'>
            <p className='text-xs'> Your share </p>
            {user && receipt.participants_object?.find(p => p.user_id === user.id)?.total_paid ? (
              <span className='text-lg'>
                {formatCurrency(
                  receipt.participants_object?.find(p => p.user_id === user.id)?.total_paid || 0
                )}
              </span>
            ) : (
              <span className='outline-1 outline-gray-200 px-3 py-1 rounded-2xl text-xs text-gray-500 mt-1'>
                Login to view your share
              </span>
            )}
          </div>

          <div className='flex flex-col'>
            <p className='text-xs text-gray-500'> Total bill </p>
            <span className='text-lg'>{formatCurrency(receipt?.nett_amount || 0)}</span>
          </div>
        </div>

      </div>



      <div className="my-5 space-y-4">
        {/* Receipt Image */}
        {receipt.file_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white overflow-hidden shadow-sm"
          >
            <img
              src={receipt.file_url}
              alt="Receipt"
              className="w-full h-64 object-cover"
            />
          </motion.div>
        )}


        {/* {receipt.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm text-gray-700">{receipt.notes}</p>
                  </div>
                </div>
              )} */}


        {/* Items List */}
        {/* {receipt.items_object && receipt.items_object.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Items ({receipt.items_object.length})</h3>
            <div className="space-y-3">
              {receipt.items_object.map((item, index) => (
                <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                          {item.id}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-8">
                        Qty: {item.quantity || 1}
                        {item.consumed_by && item.consumed_by.length > 0 && (
                          <span className="ml-3">Shared by: {item.consumed_by.length} people</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 ml-8 mt-1">
                        {item.tax_amount > 0 && (
                          <span className="mr-3">Tax: {formatCurrency(item.tax_amount)}</span>
                        )}
                        {item.rounding_adj && (
                          <span>Rounding: {formatCurrency(item.rounding_adj)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">{formatCurrency(item.nett_price)}</div>
                      {item.price !== item.nett_price && (
                        <div className="text-xs text-gray-500 line-through">
                          Pre-tax: {formatCurrency(item.price)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )} */}

        {/* Participants & Split Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-4"
        >

          {/* All Participants */}
          {receipt.participants_object && receipt.participants_object.length > 0 && (
            <div className="space-y-3">
              {receipt.participants_object.map((participant, index) => (
                <div key={participant.user_id || index} className={`w-full pt-3 pb-5 border-b border-gray-100 
                  ${participant.user_id === user?.id

                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${participant.user_id === user?.id
                        ? 'bg-purple-100'
                        : 'bg-gray-100'
                        }`}>
                        <span className={`text-xs font-medium ${participant.user_id === user?.id
                          ? 'text-purple-600'
                          : 'text-gray-500'
                          }`}>
                          {participant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {participant.name}
                          {participant.user_id === user?.id && (
                            <span className="ml-2 text-xs text-purple-600 font-medium">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{participant.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-md ${participant.user_id === user?.id
                        ? 'text-purple-600'
                        : 'text-gray-700'
                        }`}>
                        {formatCurrency(participant.total_paid)}
                      </p>
                    </div>
                  </div>

                  {/* Show item breakdown for this participant */}
                  {participant.items_paid && participant.items_paid.length > 0 && (
                    <div className="mt-2 pt-2 border-gray-200">
                      <div className="space-y-2">
                        {participant.items_paid.map((item, itemIndex) => {
                          // Find the original item from items_object to get the name
                          const originalItem = receipt.items_object?.find(i => i.id === item.id);
                          return (
                            <div key={itemIndex} className="flex justify-between items-center text-gray-500 text-xs bg-gray-white px-3 py-2 rounded-lg ">
                              <div className="flex items-center space-x-1 flex-1">
                                <span className="font-semibold truncate">
                                  {item.id} .
                                </span>
                                <span className="font-bold truncate">
                                  {originalItem?.name || `Item ${item.id}`}
                                </span>
                                {item.percentage < 100 && (
                                  <div className="flex items-center space-x-1 flex-shrink-0">
                                    <span className="">({item.percentage.toFixed(0)}%)</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end text-right ml-2">
                                <span className="font-medium">{formatCurrency(item.value)}</span>
                                {/* {item.split_type && (
                                  <span className="text-gray-400 text-xs capitalize">{item.split_type}</span>
                                )} */}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}


          <h5 className="text-md font-semibold text-purple-500 p-2 pt-5">Split Summary:</h5>

          {/* Summary breakdown */}
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1 text-sm text-gray-400">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total participants:</span>
                <span className="font-medium">{receipt.participants_object?.length || 0}</span>
              </div>

              <div className='flex justify-between'>
                <span className="text-gray-400 text-sm">Bill issued by: </span>
                {
                  receipt.paid_by === user?.email ? 'You' :
                    receipt.participants_object?.find(p => p.phone === receipt.paid_by)?.name ||
                    receipt.participants_object?.find(p => p.user_id === receipt.paid_by)?.name ||
                    receipt.paid_by
                }
              </div>
              <div className='flex justify-between'>
                <span className="text-gray-400 text-sm">Bill issuer contact: </span>
                {
                  receipt.paid_by === (user?.email || user?.phone) ? 'You' :
                    receipt.participants_object?.find(p => p.phone === receipt.paid_by)?.phone || "No phone number found"
                }
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}