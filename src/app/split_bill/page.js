'use client';

import { Button } from '@/components/ui/button';
import { CheckIcon, Edit, Edit2Icon, EditIcon, SlashIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, UserIcon, ListTodoIcon, ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import LoginCard from '@/components/clientcomponents/loginCard';
import TestPage from '@/test'

export default function SplitBill() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0);
  const [expandedCards, setExpandedCards] = useState({});
  const [participantPaymentStatus, setParticipantPaymentStatus] = useState({});
  const [billData, setBillData] = useState(null);
  const router = useRouter();
  const { user } = useAuth();
  const [isLoginCardOpen, setIsLoginCardOpen] = useState(false);

  // Add effect to load bill data from review page
  useEffect(() => {
    const storedData = localStorage.getItem("split_bill_receiptData");

    if (storedData) {
      const parsed = JSON.parse(storedData);
      console.log("Receipt data received in split_bill:", parsed);

      // Format the data to match the expected response structure
      const formattedResponse = {
        response: "Bill data loaded successfully",
        status: "success",
        data: parsed.receiptData // This contains the structured data from review page
      };

      setResponse(formattedResponse);
      setBillData(parsed.receiptData);
    }
  }, []);


  // Example: Direct client-side API call
  async function callBackendDirectly(message, billData) {
    try {
      // Call your backend API directly
      const response = await fetch('/api/backend/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          input: billData
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling backend directly:', error);
      throw error;
    }
  }

  const handleSubmit = async (e, directMessage = null) => {
    // Make preventDefault optional
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Use directMessage if provided, otherwise use the state message
    const messageToProcess = directMessage || message;

    if (!messageToProcess.trim()) return;

    const userMessage = messageToProcess.trim();
    setChatHistory(prev => [...prev, { type: 'user', content: userMessage }]);
    setMessage('');
    setLoading(true);
    setError(null);

    try {
      const result = await callBackendDirectly(userMessage, billData)

      console.log("Response from API:", result);
      setResponse(result);
      setChatHistory(prev => [...prev, { type: 'assistant', content: result.response }]);
      //Retain memory of previous chat requests on JSON
      setBillData(billData);

      // Fix: Stringify the billData before storing
      localStorage.setItem("split_bill_receiptData", JSON.stringify({
        receiptData: result.data
      }))
      console.log("Successfully saved to localStorage:", billData);


    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getRandomColor = () => {
    const colors = [
      { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', border: 'border-blue-200', accent: 'bg-blue-600' },
      { bg: 'bg-gradient-to-br from-green-50 to-green-100', border: 'border-green-200', accent: 'bg-green-600' },
      { bg: 'bg-gradient-to-br from-purple-50 to-purple-100', border: 'border-purple-200', accent: 'bg-purple-600' },
      { bg: 'bg-gradient-to-br from-pink-50 to-pink-100', border: 'border-pink-200', accent: 'bg-pink-600' },
      { bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100', border: 'border-yellow-200', accent: 'bg-yellow-600' },
      { bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100', border: 'border-indigo-200', accent: 'bg-indigo-600' },
      { bg: 'bg-gradient-to-br from-red-50 to-red-100', border: 'border-red-200', accent: 'bg-red-600' },
      { bg: 'bg-gradient-to-br from-orange-50 to-orange-100', border: 'border-orange-200', accent: 'bg-orange-600' }
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const removeParticipant = (index) => {
    if (response?.data?.participants) {
      const updatedParticipants = response.data.participants.filter((_, i) => i !== index);
      setResponse(prev => ({
        ...prev,
        data: {
          ...prev.data,
          participants: updatedParticipants
        }
      }));
      if (currentParticipantIndex >= updatedParticipants.length) {
        setCurrentParticipantIndex(Math.max(0, updatedParticipants.length - 1));
      }
    }
  };


  const toggleCardExpansion = (participantIndex) => {
    setExpandedCards(prev => ({
      ...prev,
      [participantIndex]: !prev[participantIndex]
    }));
  };

  // Function to toggle payment status
  const togglePaymentStatus = (participantEmail) => {
    setParticipantPaymentStatus(prev => ({
      ...prev,
      [participantEmail]: !prev[participantEmail]
    }));
  };

  // Function to check if participant is bill owner
  const isBillOwner = (participantEmail) => {

    console.log("Bill owner : ", response?.data?.paid_by)
    console.log("isBillOwner : ", participantEmail)
    console.log("ISBillOwner? ", response?.data?.paid_by === participantEmail)
    return response?.data?.paid_by === participantEmail;
  };

  // Function to get payment status
  const getPaymentStatus = (participantEmail) => {
    if (isBillOwner(participantEmail)) {
      return 'owner';
    }
    return participantPaymentStatus[participantEmail] ? 'paid' : 'unpaid';
  };

  // Function to handle quick messages
  const handleQuickMessage = async (messageText) => {
    // Set the message for UI display
    setMessage(messageText.trim());
    // Pass the message directly to handleSubmit
    await handleSubmit(null, messageText.trim());
  };

  const handleConfirmationPopUp = () => {
    if (user) {
      setShowBillModal(true)
    } else {
      setIsLoginCardOpen(true);
      toast.warning("Please login to continue this action")
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col relative">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { router.back() }} className="text-purple-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="w-16" />
        </div>
      </div>


      {/* Upper Half - Chat Section */}
      <div className="h-1/2 flex flex-col">
        {/* Chat History */}
        <div className="flex-1 px-4 py-4 bg-white space-y-3 overflow-y-auto">
          {/* Add initial message if bill data is available */}
          {billData && chatHistory.length === 0 && (
            <div className="flex justify-start">
              <div className="bg-white shadow-sm px-4 py-2 rounded-2xl text-gray-700 max-w-xs lg:max-w-md">
                <p className="text-sm">
                  I can see your bill from {billData.name}.
                  Total amount: MYR {billData.nett_amount?.toFixed(2)}.
                  How would you like to split this bill?
                </p>

                {/* Quick chat starters */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => handleQuickMessage("Can you divide the bill equally?")}
                    className="block w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm transition-colors"
                  >
                    💰 Can you divide the bill equally?
                  </button>

                  <button
                    onClick={() => handleQuickMessage("Can you move all items from alice to bob?")}
                    className="block w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm transition-colors"
                  >
                    📋 Can you move all items from alice to bob?
                  </button>

                  <button
                    onClick={() => handleQuickMessage("Can you move item 1 from alice to bob?")}
                    className="block w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm transition-colors"
                  >
                    🔄 Can you move item 1 from alice to bob?
                  </button>
                </div>
              </div>
            </div>
          )}

          {chatHistory.map((chat, index) => (
            <div key={index} className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-md px-4 py-2 rounded-2xl ${chat.type === 'user'
                ? 'bg-purple-600 text-white'
                : 'bg-white outline-purple-300 outline-2 text-gray-700'
                }`}>
                <p className="text-sm whitespace-pre-wrap">{chat.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="bg-white px-4 py-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <div className="flex flex-row w-full gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder=" Message.."
                className="w-5/6 p-3 bg-gray-100/80 outline-none rounded-2xl focus:border-transparent resize-none text-xs"
                rows="1"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="bg-purple-600 text-xs text-white px-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>

          </form>
          {/* <button
            // disabled={loading || !message.trim()}
            className="bg-blue-600 text-xs text-white px-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className='flex flex-row items-center gap-1 text-xs'>
              <Plus width={16} height={16} /> friends
            </div>
          </button> */}

        </div>
      </div>

      {/* Lower Half - Bill Breakdown */}
      <div className="h-1/2 bg-white ">
        {response?.data ? (
          <div className="h-full flex flex-col">
            {/* Participants and Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {response.data.participants.map((participant, index) => {
                console.log("participant", participant)
                const isExpanded = expandedCards[index];
                const itemsToShow = isExpanded ? participant.items_paid : participant.items_paid.slice(0, 2);
                const hasMoreItems = participant.items_paid.length > 2;
                const paymentStatus = getPaymentStatus(participant.email);

                return (
                  <div key={index} className="rounded-lg p-4">
                    <div className={`bg-white border-gray-100/60 border-2 rounded-2xl p-4 shadow-lg h-full transition-all duration-300 ease-in-out`}>
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`bg-white outline-1 outline-gray-300 rounded-full p-2 relative`}>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-600 text-sm flex items-center gap-2">
                              {participant.email.split('@')[0].slice(0, 10).toUpperCase()}
                              {participant.email.split('@')[0].length > 10 ? '..' : ''}
                            </h4>
                            
                            <p className="text-xs text-gray-400">
                              {participant.email.slice(0, 20)}
                              {participant.email.split('@')[0].length > 20 ? '..' : ''}

                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">
                            {formatCurrency(participant.total_paid)}
                          </div>
                        </div>
                      </div>

                      {/* Items List with Animation */}
                      <div className="mb-3">
                        <div className="space-y-2">
                          {itemsToShow.map((item, itemIndex) => {
                            const billItem = response.data.items.find(i => i.id === item.id);
                            console.log("Item", item)
                            return (
                              <div
                                key={itemIndex}
                                className={`flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 transition-all duration-300 ease-in-out transform ${isExpanded && itemIndex >= 2
                                  ? 'opacity-100 translate-y-0'
                                  : itemIndex >= 2
                                    ? 'opacity-0 -translate-y-2'
                                    : 'opacity-100 translate-y-0'
                                  }`}
                                style={{
                                  transitionDelay: isExpanded && itemIndex >= 2 ? `${(itemIndex - 2) * 100}ms` : '0ms'
                                }}
                              >
                                {/* Left side - ID and Item Info */}
                                <div className="flex items-center space-x-3">
                                  <div className="flex flex-row items-center px-2 py-1 bg-purple-500 text-white rounded-full text-xs font-bold flex-shrink-0 whitespace-nowrap">
                                    ID: {item.id || 0}
                                  </div>

                                  <div className="flex flex-col">
                                    <span className="text-gray-800 font-medium text-xs">
                                      {billItem?.name || `Item ${item.id}`}
                                    </span>
                                    <div className="text-gray-500 text-sm">
                                      {item.percentage?.toString().slice(0, 5)}%
                                    </div>
                                  </div>
                                </div>

                                {/* Right side - Price and Tax Info */}
                                <div className="flex flex-col items-end">
                                  <span className="text-gray-800 font-semibold text-base mb-1">
                                    {formatCurrency(item.value)}
                                  </span>
                                  <div className="text-xs text-right font-bold">
                                    <div className="text-purple-500">incl 10%</div>
                                    <div className="text-purple-300">incl 6%</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Expand/Collapse Button */}
                        {hasMoreItems && (
                          <button
                            onClick={() => toggleCardExpansion(index)}
                            className="w-full mt-3 flex items-center justify-center space-x-2 py-2 text-gray-600 hover:text-purple-700 transition-colors duration-200"
                          >
                            <span className="text-sm font-bold animate-pulse">
                              {isExpanded
                                ? `Show Less`
                                : `Show ${participant.items_paid.length - 2} More Items`
                              }
                            </span>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-4 h-4 transition-transform duration-300" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4 transition-transform duration-300" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        {paymentStatus === 'owner' ? (
                          <div className="flex flex-row w-full justify-center items-center gap-3 bg-white border border-gray-200 py-2 px-4 rounded-full text-center text-sm font-medium">
                            <UserIcon className="w-4 h-4" />
                            <p>Bill Owner</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => togglePaymentStatus(participant.email)}
                            className={`flex flex-row w-full justify-center items-center gap-3 py-2 px-4 rounded-full text-center text-sm font-medium transition-all duration-200 ${paymentStatus === 'paid'
                              ? 'bg-white border border-gray-200 text-black'
                              : 'bg-black text-white'
                              }`}
                          >
                            {paymentStatus === 'paid' ? (
                              <>
                                <CheckIcon width={16} height={16} className='stroke-green-600' />
                                <p>Paid</p>
                              </>
                            ) : (
                              <>
                                <ListTodoIcon width={16} height={16} className='stroke-white' />
                                <p>Unpaid</p>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View Bill Button */}
            <div className="px-4 py-3">
              <button
                onClick={handleConfirmationPopUp}
                className="w-full rounded-3xl bg-purple-600 text-white py-3 px-4 font-medium hover:bg-purple-700 transition-colors"
              >
                View Bill Details
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">No bill data yet</p>
              <p className="text-sm">Start a conversation to split your bill!</p>
            </div>
          </div>
        )}
      </div>

      {/* Add LoginCard at the end, before closing div */}
      <LoginCard
        isOpen={isLoginCardOpen}
        onClose={() => setIsLoginCardOpen(false)}
      />

      {/* Bottom Slide-up Modal */}
      {showBillModal && response?.data && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowBillModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden">
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Billing Section */}
            <div className="px-6 py-4 overflow-y-auto">
              <div className="flex flex-col justify-between mb-4 gap-2">
                <h3 className="text-2xl font-semibold text-gray-800">Billing confirmation</h3>
                <p className='text-xs text-gray-500'>
                  This will send an email notification requesting for the receipt split amount
                </p>
                {/* <div className="flex space-x-4 text-sm">
                  <span className="text-gray-400">Near By</span>
                  <span className="text-gray-800 font-medium border-b-2 border-gray-800">Recent</span>
                  <span className="text-gray-400">History</span>
                </div> */}
              </div>

              {/* Horizontal Participant Cards Container */}
              <div className="mb-6">
                <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide snap-x snap-mandatory">
                  {response.data.participants.map((participant, index) => {
                    const colorScheme = getRandomColor();
                    const paymentStatus = getPaymentStatus(participant.email);

                    return (
                      <div key={index} className="flex-shrink-0 w-80 snap-start">
                        <div className={`bg-white border-gray-200/60 border-1 rounded-2xl p-4 shadow-lg h-full`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`bg-white outline-1 outline-gray-300 rounded-full p-2 relative`}>
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-600 text-lg flex items-center gap-2">
                                  {participant.email.split('@')[0].slice(0, 16).toUpperCase()}
                                  {participant.email.split('@')[0].length > 16 ? '...' : ''}
                                </h4>
                                <p className="text-xs text-gray-400">{participant.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Bill Info */}
                          <div className="mb-3">
                            <div className="text-2xl font-bold text-gray-800">
                              {formatCurrency(participant.total_paid)}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex space-x-2">
                            {paymentStatus === 'owner' ? (
                              <div className="flex flex-row w-full justify-center items-center gap-3 bg-white text-black outline-1 outline-gray-200 py-2 px-4 rounded-full text-center text-sm font-medium">
                                <UserIcon className="w-4 h-4 fill-white" />
                                <p>Bill Owner</p>
                              </div>
                            ) : (
                              <button
                                onClick={() => togglePaymentStatus(participant.email)}
                                className={`flex flex-row w-full justify-center items-center gap-3 py-2 px-4 rounded-full text-center text-sm font-medium transition-all duration-200 ${paymentStatus === 'paid'
                                  ? 'bg-white border border-gray-100 text-black'
                                  : 'bg-black text-white'
                                  }`}
                              >
                                {paymentStatus === 'paid' ? (
                                  <>
                                    <CheckIcon width={16} height={16} className='stroke-green-600' />
                                    <p>Paid</p>
                                  </>
                                ) : (
                                  <>
                                    <ListTodoIcon width={16} height={16} className='stroke-white' />
                                    <p>Unpaid</p>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scroll Indicator Dots */}
                <div className="flex justify-center space-x-2 mt-4">
                  {response.data.participants.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentParticipantIndex ? 'bg-gray-800' : 'bg-gray-300'
                        }`}
                    />
                  ))}
                </div>
              </div>

              <TestPage />
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 z-40">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
