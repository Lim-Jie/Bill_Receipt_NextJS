"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Plus, Check, Users, Receipt, Sparkles, LogOut, ArrowRight, HelpCircleIcon, ForkKnife } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import FileUpload from "@/components/clientcomponents/fileUpload";
import { motion } from 'framer-motion'
import { supabase } from "@/lib/supabase";
// Mock data for preview mode
const MOCK_RECEIPTS = [
  {
    id: 'preview-1',
    name: 'Dinner at Italian Restaurant',
    nett_amount: 85.50,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
    paid_by: 'john@example.com'
  },
  {
    id: 'preview-2',
    name: 'Grocery Shopping',
    nett_amount: 124.75,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    paid_by: 'You'
  },
  {
    id: 'preview-3',
    name: 'Coffee & Breakfast',
    nett_amount: 32.20,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    paid_by: 'sarah@example.com'
  }
];

const MOCK_INVITED_EMAILS = [
  { id: 'mock-1', name: 'John Doe', email: 'john@example.com' },
  { id: 'mock-2', name: 'Sarah Smith', email: 'sarah@example.com' },
  { id: 'mock-3', name: 'Mike Johnson', email: 'mike@example.com' }
];

const MOCK_EXPENSE_DATA = [
  { name: 'Food & Dining', value: 145.70, color: '#2C7FFF' },
  { name: 'Groceries', value: 124.75, color: '#193CB8' },
  { name: 'Entertainment', value: 67.00, color: '#8B5CF6' }
];

// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays === 2) return '2 days ago';
  if (diffDays === 3) return '3 days ago';
  if (diffDays <= 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short'
  });
};

export default function Main() {
  const router = useRouter();
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedPeriod') || 'This Month';
    }
    return 'This Month';
  });
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // Real data states for authenticated users
  const [allReceipts, setAllReceipts] = useState([]); // Store all receipts
  const [invitedEmails, setInvitedEmails] = useState([]);
  const [initialDataLoading, setInitialDataLoading] = useState(false); // Only for initial load

  // Get auth state and functions from your AuthProvider
  const { user, loading: authLoading, signOut, signInWithGoogle } = useAuth();

  // Time period options
  const periodOptions = ['Today', 'Weekly', 'This Month'];

  // Filter receipts based on selected period (client-side filtering)
  const filteredReceipts = useMemo(() => {
    if (!user) return MOCK_RECEIPTS;

    const now = new Date();
    let startDate;

    switch (selectedPeriod) {
      case 'Today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'Weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'This Month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return allReceipts.filter(receipt => {
      const receiptDate = new Date(receipt.created_at);
      return receiptDate >= startDate;
    });
  }, [allReceipts, selectedPeriod, user]);

  // Calculate expense data and total amount
  const { expenseData, totalAmount } = useMemo(() => {
    const receipts = user ? filteredReceipts : MOCK_RECEIPTS;
    const mockExpenseData = MOCK_EXPENSE_DATA;

    if (!user) {
      return {
        expenseData: mockExpenseData,
        totalAmount: mockExpenseData.reduce((sum, item) => sum + item.value, 0)
      };
    }

    const total = receipts.reduce((sum, receipt) => sum + (receipt.nett_amount || 0), 0);

    // Group receipts by category for pie chart
    const categoryMap = {};
    receipts.forEach(receipt => {
      const category = receipt.category || 'Others';
      if (!categoryMap[category]) {
        categoryMap[category] = { name: category, value: 0 };
      }
      categoryMap[category].value += receipt.nett_amount || 0;
    });

    const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
    const expenseCategories = Object.values(categoryMap).map((category, index) => ({
      ...category,
      color: colors[index % colors.length]
    }));

    return {
      expenseData: expenseCategories,
      totalAmount: total
    };
  }, [filteredReceipts, user]);

  // Fetch all receipts once (without date filtering)
  const fetchAllReceipts = useCallback(async () => {
    if (!user) return;

    setInitialDataLoading(true);
    try {
      const { data: receiptsData, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        toast.error('Failed to fetch receipts');
        return;
      }

      setAllReceipts(receiptsData || []);

    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to fetch receipts');
    } finally {
      setInitialDataLoading(false);
    }
  }, [user]);

  // Fix the fetchInvitedEmails function
  const fetchInvitedEmails = useCallback(async () => {
    if (!user) return;

    try {
      const { data: emailsData, error } = await supabase
        .from('invited_emails')
        .select('*')
        .eq('user_id', user.id)
        .order('invited_at', { ascending: false });

      if (error) {
        console.error('Error fetching invited emails:', error);
        toast.error('Failed to fetch contacts');
        return;
      }

      setInvitedEmails(emailsData || []);

    } catch (error) {
      console.error('Error fetching invited emails:', error);
      toast.error('Failed to fetch contacts');
    }
  }, [user]);

  // Fetch data when user changes (only once)
  useEffect(() => {
    if (user) {
      fetchAllReceipts();
      fetchInvitedEmails();
    } else {
      // Reset to empty for preview mode (mock data is handled in useMemo)
      setAllReceipts([]);
      setInvitedEmails([]);
      setInitialDataLoading(false);
    }
  }, [user, fetchAllReceipts, fetchInvitedEmails]);

  // Determine data to display
  const displayReceipts = user ? filteredReceipts : MOCK_RECEIPTS;
  const displayInvitedEmails = user ? invitedEmails : MOCK_INVITED_EMAILS;
  const displayExpenseData = expenseData;
  const displayTotalAmount = totalAmount;

  // Show loading only when authenticated and initial data is loading
  const overallLoading = authLoading || (user && initialDataLoading);

  const toggleTransactionSelection = (index) => {
    if (!user) {
      toast.info("Please sign in to select transactions");
      return;
    }
    setSelectedTransactions(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleUserSelection = (emailData) => {
    if (!user) {
      toast.info("Please sign in to select users");
      return;
    }
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.email === emailData.email);
      if (isSelected) {
        return prev.filter(u => u.email !== emailData.email);
      } else {
        return [...prev, {
          id: emailData.id,
          name: emailData.name || emailData.email.split("@")[0],
          email: emailData.email,
          avatar: (emailData.name || emailData.email.split("@")[0]).substring(0, 2).toUpperCase(),
        }];
      }
    });

    console.log("selectedUsers", selectedUsers)
  };

  const getSelectedEmails = () => {
    return selectedUsers.map(user => user.email);
  };

  const handleAddUser = async () => {
    if (!user) {
      toast.info("Please sign in to add users");
      return;
    }

    // Basic validation
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error("Please provide both name and email");
      return;
    }

    // Email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      // Check for existing email - fix the query
      const { data: existingUsers, error: checkError } = await supabase
        .from('invited_emails')
        .select('*')
        .eq('user_id', user.id)
        .eq('email', newUserEmail.trim());

      if (checkError) {
        throw checkError;
      }

      if (existingUsers && existingUsers.length > 0) {
        toast.error("This email is already in your contacts");
        return;
      }

      const now = new Date().toISOString();

      const { data: newUser, error } = await supabase
        .from('invited_emails')
        .insert([{
          user_id: user.id,
          email: newUserEmail.trim(),
          name: newUserName.trim(),
          invited_at: now,
          last_used_at: now,
        }])
        .select();

      if (error) {
        throw error;
      }

      if (newUser && newUser.length > 0) {
        const newUserData = {
          id: newUser[0].id,
          name: newUser[0].name,
          email: newUser[0].email
        };

        toggleUserSelection(newUserData);

        setNewUserName('');
        setNewUserEmail('');
        setIsAddUserDialogOpen(false);

        // Refresh invited emails list
        await fetchInvitedEmails();

        toast.success(`Added ${newUserName.trim()} successfully`);
      } else {
        throw new Error('Failed to retrieve the newly created user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user. Please try again.');
    }
  };

  const handleLoginLogout = async () => {
    if (authLoading) return;

    if (user) {
      try {
        await signOut();
        // Clear selected state when logging out
        setSelectedTransactions([]);
        setSelectedUsers([]);
        // Don't redirect to login, stay on preview mode
      } catch (error) {
        console.error('Error signing out:', error);
      }
    } else {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error('Error signing in:', error);
      }
    }
  };

  const handleScanReceipt = () => {
    setIsFileUploadOpen(true);
  };

  const handleAddUserDialog = () => {
    if (!user) {
      toast.info("Please sign in to add users");
      return;
    }
    setIsAddUserDialogOpen(true);
  };

  // Save period to localStorage when it changes (only for authenticated users)
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem('selectedPeriod', selectedPeriod);
    }
  }, [selectedPeriod, user]);

  // Add visibilitychange event listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page is now visible again
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (selectedUsers.length === 0 && user  && !authLoading) {
      const form = {
        id: user.id,
        name: user.user_metadata?.name || user.email.split("@")[0],
        email: user.email,
        avatar: user.email.split("@")[0].substring(0, 2).toUpperCase(),
      };
      setSelectedUsers([form]);
    } else if (selectedUsers.length === 0 && !user && !authLoading) {
      const form = {
        id: null,
        name: "User",
        email: "you@example.com",
        avatar: "JS",
      };
      setSelectedUsers([form]);
    }
  }, [user, selectedUsers.length, authLoading]);

  // Show loading only when authenticated and loading initial data
  if (overallLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl text-gray-900">JomSplit.com</h1>
          <div className="flex items-center space-x-2">
            <div className="flex flex-col gap-1">
              <div className="flex flex-row items-center ml-auto">
                <Button
                  className="bg-inherit shadow-none hover:bg-gray-100"
                  onClick={handleLoginLogout}
                  disabled={authLoading}
                >
                  {user ? (
                    <LogOut className="text-red-500 w-5 h-5" />
                  ) : (
                    <ArrowRight className="text-purple-500 w-5 h-5" />
                  )}
                </Button>

                {user ? (
                  <span className="h-fit bg-purple-500 text-white px-3 py-1 rounded-full text-sm w-fit">
                    {user.user_metadata?.name}
                  </span>
                ) : (
                  <Button className="h-fit bg-purple-500 text-white px-3 py-1 rounded-full text-sm w-fit"
                    onClick={handleLoginLogout}>
                    Login
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Banner for non-authenticated users */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">Preview Mode</p>
                <p className="text-xs text-purple-700">Sign in to access your real data and all features</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Time Period Selector */}
        <div className="mb-6">
          <div className="bg-gray-100 p-1 rounded-2xl flex">
            {periodOptions.map((period) => (
              <button
                key={period}
                onClick={() => user && setSelectedPeriod(period)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${selectedPeriod === period
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  } ${!user ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Expense Overview Section - Add smooth transition */}
        <motion.div
          key={`${selectedPeriod}-${displayTotalAmount}`}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl p-6 mb-6 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">
                Total bill - {selectedPeriod}
              </p>
              <p className="text-2xl text-gray-900">{formatCurrency(displayTotalAmount)}</p>
            </div>
            {displayExpenseData.length > 0 ? (
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayExpenseData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#D1D5DB"
                      dataKey="value"
                      stroke="none"
                    >
                      {displayExpenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-32 h-32 flex items-center justify-center text-gray-400 text-xs">
                No expense data
              </div>
            )}
          </div>

          {/* Category Legend */}
          {displayExpenseData.length > 0 && (
            <div className="mt-4 space-y-2">
              {displayExpenseData.slice(0, 3).map((entry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-sm text-gray-700">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Add People Cards - Horizontally Scrollable */}
        {displayInvitedEmails.length > 0 ? (
          <div className="mb-3">
            <div className="overflow-x-auto pb-4 hide-scrollbar">
              <div className="flex space-x-4 min-w-max px-4">
                {displayInvitedEmails.map((emailData) => {
                  const isSelected = selectedUsers.some(u => u.email === emailData.email);
                  const displayName = emailData.name || emailData.email.split("@")[0];
                  const avatar = displayName.substring(0, 2).toUpperCase();
                  return (
                    <div key={emailData.id} className="w-32 flex-shrink-0">
                      <div
                        className={`rounded-2xl p-4 text-center transition-all duration-200 ${user ? 'cursor-pointer' : 'cursor-default'
                          } ${isSelected
                            ? 'bg-purple-100 border-2 border-purple-300'
                            : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        onClick={() => toggleUserSelection(emailData)}
                      >
                        <div className="mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mx-auto mb-2 ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-400 text-white'
                            }`}>
                            {avatar}
                          </div>
                          <p className="text-xs font-medium text-gray-900 truncate">{displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{emailData.email}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-colors ${isSelected
                          ? 'bg-purple-500'
                          : 'bg-blue-400 hover:bg-blue-500'
                          }`}>
                          {isSelected ? (
                            <Check className="w-6 h-6 text-white" />
                          ) : (
                            <Plus className="w-6 h-6 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="w-32 flex-shrink-0"
            onClick={handleAddUserDialog}>
            <div
              className={`rounded-2xl p-4 text-center transition-all duration-200 bg-gray-100 hover:bg-gray-200 `}
            >
              <div className="mb-2">
                {user && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mx-auto mb-2 bg-gray-400 text-white`}>
                    {(() => {
                      const avatar = user?.email.split("@")[0].substring(0, 2).toUpperCase();
                      return avatar;
                    })()}
                  </div>
                )}
                <p className="text-xs font-medium text-gray-900 truncate"></p>
                <p className="text-xs text-gray-500 truncate">Email</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-colors bg-blue-400 hover:bg-blue-500`}>
                <Plus className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-row gap-3 items-center ml-auto">
            <p className="text-sm text-gray-600">Add friends</p>
            <button
              onClick={handleAddUserDialog}
              className={`w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center transition-colors ${user ? 'hover:bg-purple-700 cursor-pointer' : 'opacity-50 cursor-default'
                }`}
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Display selected emails */}
        {selectedUsers.length > 0 && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-purple-900">Selected users:</p>
            <p className="text-xs text-purple-700">{getSelectedEmails().join(', ')}</p>
          </div>
        )}
      </div>

      {/* Your Transactions Section - Add smooth transition */}
      <div className="px-4 mb-20 bg-white">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Your transactions</h3>

        {(user && initialDataLoading) ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse" style={{ height: '100px', backgroundColor: '#e2e8f0', borderRadius: '1rem' }}></div>
            ))}
          </div>
        ) : displayReceipts.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No receipts yet</p>
            <p className="text-sm text-gray-500">Start by scanning your first receipt</p>
          </div>
        ) : (
          <motion.div
            key={`transactions-${selectedPeriod}-${displayReceipts.length}`}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className="space-y-3">
              {displayReceipts
                .slice(0, showAllTransactions ? displayReceipts.length : 3)
                .map((receipt, index) => (
                  <div
                    key={receipt.id}
                    className={`rounded-2xl p-4 bg-white shadow-sm outline-1 outline-gray-100/80 transition-all duration-200 ${user ? 'cursor-pointer' : 'cursor-default'
                      } ${selectedTransactions.includes(index)
                        ? 'border-gray-200 '
                        : 'border-gray-100'
                      }`}
                    onClick={() => toggleTransactionSelection(index)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="rounded-lg flex p-1">
                            <ForkKnife className="w-4 h-4 text-purple-500 stroke-2 fill-purple-300" />
                          </div>
                          <h4 className="text-gray-900 text-base font-medium">{receipt.name || 'Untitled Receipt'}</h4>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                          <div className="flex items-center space-x-6">
                            <div className="flex flex-col items-center mt-3">
                              <span className="text-xs">{formatDate(receipt.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-3">
                        <div className="flex flex-col gap-3">
                          <div className="flex text-xl font-bold text-gray-700 ml-auto">
                            {formatCurrency(receipt.nett_amount)}
                          </div>
                          <div className="flex flex-row items-center gap-2 text-md">
                            <span className="">Paid by</span>
                            <span className=" font-semibold text-purple-400">
                              {user ? (
                                receipt.paid_by === user.email ? "You" : (receipt.paid_by?.split("@")[0] || "Unknown")
                              ) : (
                                receipt.paid_by === 'You' ? 'You' : receipt.paid_by?.split("@")[0]
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Fade Effect and View More Button */}
            {!showAllTransactions && displayReceipts.length > 3 && (
              <div className="relative">
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>

                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setShowAllTransactions(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <span>View more ({displayReceipts.length - 3} more)</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Show Less Button */}
            {showAllTransactions && displayReceipts.length > 3 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setShowAllTransactions(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <span>Show less</span>
                  <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="" />
      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {selectedTransactions.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-400 rounded flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-600">
                  {selectedTransactions.length} transactions
                </span>
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-purple-400 rounded flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-600">
                  {selectedUsers.length} users
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleScanReceipt}
            className={`bg-purple-600 text-white px-6 py-3 rounded-full font-medium transition-colors ${user ? 'hover:bg-purple-700 cursor-pointer' : 'opacity-75 cursor-default'
              }`}
          >
            Scan new receipt
          </button>
        </div>
      </div>

      {/* FileUpload - Only render if user is authenticated */}

      <FileUpload
        isOpen={isFileUploadOpen}
        onClose={() => setIsFileUploadOpen(false)}
        selectedUsers={selectedUsers}
      />


      {/* Add User Dialog - Only render if user is authenticated */}
      {user && isAddUserDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="userName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="userEmail"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsAddUserDialogOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}