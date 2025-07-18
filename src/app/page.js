"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Plus, Check, Users, Receipt, Sparkles, LogOut, ArrowRight, HelpCircleIcon, ForkKnife, ScanIcon, SearchIcon, Minus, PlusIcon, Smile, WavesIcon, Waves, HandIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { getUserPhoneNumber, useAuth } from "@/components/auth/auth-provider";
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
    paid_by: 'john@example.com',
    total_paid: 10.00
  },
  {
    id: 'preview-2',
    name: 'Grocery Shopping',
    nett_amount: 124.75,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    paid_by: 'You',
    total_paid: 34.60

  },
  {
    id: 'preview-3',
    name: 'Coffee & Breakfast',
    nett_amount: 32.20,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    paid_by: 'sarah@example.com',
    total_paid: 9.60

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

const limitPagination = 4;

export default function Main() {
  const router = useRouter();
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedPeriod') || 'Monthly';
    }
    return 'Monthly';
  });
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isAddFriendDialogOpen, setIsAddFriendDialogOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendPhone, setNewFriendPhone] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Real data states for authenticated users
  const [allReceipts, setAllReceipts] = useState([]); // Store all receipts
  const [invitedEmails, setInvitedEmails] = useState([]);
  const [initialDataLoading, setInitialDataLoading] = useState(false); // Only for initial load
  const [friends, setFriends] = useState([])
  const [receiptPage, setReceiptPage] = useState(1) // Add receipt pagination
  const [receiptHasMore, setReceiptHasMore] = useState(false) // Add receipt pagination state
  const [loadingReceipts, setLoadingReceipts] = useState(false) // Add loading state for receipts
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingFriends, setLoading] = useState(false)

  // Add new state for expense data
  const [expenseData, setExpenseData] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [expenseLoading, setExpenseLoading] = useState(false);

  // Get auth state and functions from your AuthProvider
  const { user, loading: authLoading, signOut, signInWithGoogle } = useAuth();

  // Time period options
  const periodOptions = ['Today', 'Weekly', 'Monthly'];

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
      case 'Monthly':
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

  // Replace the existing expenseData useMemo with this function
  const fetchExpenseSummary = useCallback(async () => {
    if (!user) {
      // Use mock data for non-authenticated users
      setExpenseData(MOCK_EXPENSE_DATA);
      setTotalAmount(MOCK_EXPENSE_DATA.reduce((sum, item) => sum + item.value, 0));
      return;
    }

    setExpenseLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/expense-summary?period=${encodeURIComponent(selectedPeriod)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch expense summary');
      }

      setExpenseData(data.expenseData);
      setTotalAmount(data.totalAmount);

    } catch (error) {
      console.error('Error fetching expense summary:', error);
      toast.error('Failed to fetch expense data');
    } finally {
      setExpenseLoading(false);
    }
  }, [user, selectedPeriod]);

  // Add useEffect to fetch expense data when period changes
  useEffect(() => {
    fetchExpenseSummary();
  }, [fetchExpenseSummary]);

  // Fetch receipts using the new API route with pagination
  const fetchReceiptsPage = useCallback(async (p = 1, resetData = false) => {
    if (!user) return;

    setLoadingReceipts(true);
    if (p === 1) setInitialDataLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/receipts?page=${p}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch receipts');
      }

      if (resetData || p === 1) {
        setAllReceipts(data.receipts);
      } else {
        setAllReceipts(prev => [...prev, ...data.receipts]);
      }

      setReceiptHasMore(data.pagination.hasMore);
      setReceiptPage(p);

    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to fetch receipts');
    } finally {
      setLoadingReceipts(false);
      if (p === 1) setInitialDataLoading(false);
    }
  }, [user]);

  // Fix the fetchInvitedEmails function
  // const fetchInvitedEmails = useCallback(async () => {
  //   if (!user) return;

  //   try {
  //     const { data: emailsData, error } = await supabase
  //       .from('invited_emails')
  //       .select('*')
  //       .eq('user_id', user.id)
  //       .order('invited_at', { ascending: false });


  // Fetch data when user changes (only once)
  useEffect(() => {
    if (user) {
      fetchReceiptsPage(1, true); // Reset data when user changes
      // fetchInvitedEmails();
    } else {
      // Reset to empty for preview mode (mock data is handled in useMemo)
      setAllReceipts([]);
      setInvitedEmails([]);
      setInitialDataLoading(false);
    }
  }, [user, fetchReceiptsPage]);

  // Fetch friends data
  const fetchFriendsPage = useCallback(async (p = 1) => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/friendships?limit=${limitPagination}&page=${p}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    const json = await res.json()
    if (res.ok) {
      setFriends(prev => p === 1 ? json.friends : [...prev, ...json.friends])
      setHasMore(p * limitPagination < json.total)
      setPage(p)
    } else {
      toast.error(json.error || 'Could not load friends')
    }
    setLoading(false)
  }, [])

  // Reload friends on sign-in
  useEffect(() => {
    if (user) fetchFriendsPage(1)
    else setFriends([])
  }, [user, fetchFriendsPage])

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) {
      return friends;
    }

    const query = searchQuery.toLowerCase().trim();
    return friends.filter(friend =>
      friend.name.toLowerCase().includes(query) ||
      friend.phone.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  // Clear search when friends list changes
  useEffect(() => {
    if (!user) {
      setSearchQuery('');
    }
  }, [user]);

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
      const isSelected = prev.some(u => u.phone === emailData.phone);
      if (isSelected) {
        return prev.filter(u => u.phone !== emailData.phone);
      } else {
        return [...prev, {
          id: emailData.id,
          name: emailData.name || emailData.email.split("@")[0],
          phone: emailData.phone || emailData.email.split("@")[0],
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

  // …inside Main(), before the return:
  const handleAddFriend = async () => {
    if (!user) {
      toast.info("Please sign in to add friends")
      return
    }
    const phone = newFriendPhone.trim()
    if (!phone) {
      toast.error("Enter a valid phone number")
      return
    }

    setAddingFriend(true)
    try {
      // 1) get current session (this talks to localStorage)
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error("Not signed in")
        setAddingFriend(false)
        return
      }

      // 2) include it on the header
      const res = await fetch('/api/add-friend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // <-- send your access token explicitly
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ phone, name: newFriendName })
      })
      const payload = await res.json()

      if (!res.ok) {
        toast.warning(payload.error || 'Failed to add friend')
        return
      }

      toast.success('Friend added successfully')
      setIsAddFriendDialogOpen(false)
      setNewFriendName('')
      setNewFriendPhone('')
    } catch (err) {
      console.error('Error adding friend:', err)
      toast.error('Failed to add friend')
    } finally {
      setAddingFriend(false)
    }
  }

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
    const initializeSelectedUser = async () => {
      if (selectedUsers.length === 0 && user && !authLoading) {
        const userPhoneNumber = await getUserPhoneNumber(user);
        const form = {
          id: user.id,
          name: user.user_metadata?.name || user.email.split("@")[0],
          phone: userPhoneNumber,
          avatar: user.email.split("@")[0].substring(0, 2).toUpperCase(),
        };
        setSelectedUsers([form]);
      } else if (selectedUsers.length === 0 && !user && !authLoading) {
        const form = {
          id: null,
          name: "User",
          phone: "+60183763893",
          avatar: "JS",
        };
        setSelectedUsers([form]);
      }
    }

    initializeSelectedUser();
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
        {!user ? (
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
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="mb-4 p-3 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border border-purple-200 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <HandIcon className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Welcome</p>
                  <p className="text-xs text-purple-700">How to use our features? Click here to find out!</p>
                </div>
              </div>
            </motion.div>
          </>
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
          className="bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-200">
                Total bill - {selectedPeriod}
              </p>
              <p className="text-2xl text-gray-100">{formatCurrency(displayTotalAmount)}</p>
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
                      stroke="#000000"
                      strokeWidth={1}
                    >
                      {displayExpenseData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#9035ff"
                          strokeWidth={2}
                        />
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
            <div className="mt-4 space-y-2 text-gray-100">
              {displayExpenseData.slice(0, 3).map((entry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-sm">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Add People Cards - Horizontally Scrollable */}
     
        <div className="flex flex-row justify-between items-center">
          <h3 className="text-lg font-medium bg-white">Your Friends</h3>
          <Button
            onClick={() => setIsAddFriendDialogOpen(true)}
            className="flex items-center bg-inherit space-x-2 border-1 border-gray-200 text-gray-400 rounded-2xl px-2 py-1.5 hover:bg-purple-600 hover:text-white"
          >
            <Plus className="w-5 h-5" />
            Add friend
          </Button>
        </div>

        {/* Real Search Bar */}
        <div className="relative my-3">
          <div className="flex flex-row items-center bg-gray-100 rounded-3xl w-full p-2 text-gray-400 gap-3">
            <SearchIcon width={16} height={16} className="ml-1" />
            <input
              type="text"
              placeholder="Search friends by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-700 placeholder-gray-400 outline-none text-sm"
              disabled={!user}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <Plus className="w-3 h-3 rotate-45" />
              </button>
            )}
          </div>

          {/* Search Results Count */}
          {searchQuery && (
            <div className="mt-2 text-xs text-gray-500">
              {filteredFriends.length} friend{filteredFriends.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>

        {/* Friends List Section - Now using filteredFriends */}
        <div className="mb-3">
          <div className="overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex space-x-4 min-w-max px-4">
              {filteredFriends.map((f) => {
                const isSelected = selectedUsers.some(u => u.phone === f.phone);
                const avatar = f.name.substring(0, 2).toUpperCase();
                return (
                  <div key={f.id} className="w-32 flex-shrink-0">
                    <div
                      className={`rounded-2xl p-4 text-center transition-all duration-200 py-5 ${user ? 'cursor-pointer' : 'cursor-default'
                        } ${isSelected
                          ? 'bg-purple-100 border-2 border-purple-300'
                          : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      onClick={() => user && toggleUserSelection({
                        id: f.id,
                        name: f.name,
                        email: f.phone,
                        phone: f.phone
                      })}
                    >
                      <div className="mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mx-auto mb-2 ${isSelected ? 'bg-purple-500 text-white' : 'bg-purple-400 text-white'
                          }`}>
                          {avatar}
                        </div>
                        <p className="text-xs font-medium text-gray-900 truncate">{f.name}</p>
                        <p className="text-xs text-gray-500 truncate">{f.phone}</p>
                      </div>


                      {/* Balance Status Badge */}
                      <div className={`w-fit px-2 whitespace-nowrap py-1.5 rounded-3xl flex flex-row items-center justify-center mx-auto transition-colors text-xs bg-white outline-1 outline-gray-100 font-semibold ${f.nett_balance > 0
                        ? 'text-green-500'
                        : f.nett_balance < 0
                          ? 'text-red-500'
                          : isSelected
                            ? 'text-gray-700'
                            : 'text-gray-700'
                        }`}>
                        {f.nett_balance > 0 ? (
                          <>
                            RM {Math.abs(f.nett_balance).toFixed(2)}
                          </>
                        ) : f.nett_balance < 0 ? (
                          <>
                            RM {Math.abs(f.nett_balance).toFixed(2)}
                          </>
                        ) : isSelected ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <span className="text-gray-400">RM 0</span>
                        )}
                      </div>
                      {/* Balance Status Text - Always shown above badge */}
                      <p className={`text-xs mt-3 text-gray-400`}>
                        {f.nett_balance > 0
                          ? 'Owes you'
                          : f.nett_balance < 0
                            ? 'You owe'
                            : 'No debt'
                        }
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Add Friend Card - Show only when no search or search doesn't match any friends */}
              {(!searchQuery || filteredFriends.length === 0) && (
                <div className="w-32 flex-shrink-0" onClick={() => setIsAddFriendDialogOpen(true)}>
                  <div className="rounded-2xl p-4 text-center transition-all duration-200 bg-gray-100 hover:bg-gray-200 cursor-pointer py-5">
                    <div className="mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mx-auto mb-2 bg-gray-400 text-white">
                        <Plus className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-medium text-gray-900 truncate">Add Friend</p>
                      <p className="text-xs text-gray-500 truncate">By phone</p>
                    </div>
                    <div className="w-fit px-2 py-1.5 rounded-3xl flex items-center justify-center mx-auto transition-colors bg-blue-400 hover:bg-blue-500">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading and Empty States */}
        {loadingFriends && <p className="text-center text-gray-500 py-4">Loading friends...</p>}

        {!loadingFriends && friends.length === 0 && !searchQuery && (
          <p className="text-center text-gray-500 py-4">No friends found. Add your first friend!</p>
        )}

        {!loadingFriends && searchQuery && filteredFriends.length === 0 && friends.length > 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-2">No friends match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-purple-600 text-sm hover:underline"
            >
              Clear search
            </button>
          </div>
        )}


      </div>

      {/* {hasMore && !loadingFriends && (
        <Button
          onClick={() => fetchFriendsPage(page + 1)}
          className="w-fit rounded-3xl mt-2 px-4 py-2 bg-gray-100/60 border-1 border-purple-300 text-purple-500"
        >
          View more friends
        </Button>
      )} */}

      {/* Your Transactions Section - Add smooth transition */}
      <div className="px-4 pb-[90px] bg-white">
        <h3 className="text-xl font-bold text-gray-900 mb-4 ">Your transactions</h3>

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
                          <div className="flex text-xl font-bold text-purple-400 ml-auto">
                            {user ? (
                              formatCurrency(receipt?.total_paid || 0)
                            ) : (
                              formatCurrency(receipt.total_paid || 0)
                            )}
                          </div>
                          <div className="flex flex-row items-center gap-2 text-xs">
                            <span className="">Total :</span>
                            <span className=" font-semibold">
                              {formatCurrency(receipt.nett_amount)}

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

            {/* Load More Receipts Button */}
            {showAllTransactions && receiptHasMore && !loadingReceipts && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => fetchReceiptsPage(receiptPage + 1)}
                  className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <span>Load more receipts</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Loading indicator for more receipts */}
            {loadingReceipts && receiptPage > 1 && (
              <div className="flex justify-center pt-4">
                <div className="text-gray-500 text-sm">Loading more receipts...</div>
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
            className={`flex flex-row items-center gap-3 bg-gray-600 text-white px-6 py-3 rounded-full font-medium transition-colors ${user ? 'hover:bg-purple-700 cursor-pointer' : 'opacity-75 cursor-default'
              }`}
          >
            <ScanIcon width={16} height={16} />
            Scan receipt
          </button>
        </div>
      </div>

      {/* FileUpload - Only render if user is authenticated */}

      {isFileUploadOpen && (
        <FileUpload
          isOpen={isFileUploadOpen}
          onClose={() => setIsFileUploadOpen(false)}
          selectedUsers={selectedUsers}
        />
      )}

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

      {/* Add Friend Dialog - Only render if user is authenticated */}
      {user && isAddFriendDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Add New Friend</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="friendName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="friendName"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter friend's name"
                />
              </div>

              <div>
                <label htmlFor="friendPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  id="friendPhone"
                  value={newFriendPhone}
                  onChange={(e) => setNewFriendPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsAddFriendDialogOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFriend}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                disabled={addingFriend}
              >
                {addingFriend ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="py-10"></div>
    </div>
  );
}