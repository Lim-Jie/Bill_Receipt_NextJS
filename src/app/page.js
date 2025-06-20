"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Plus, Check, Users, Calendar, MapPin, Tag, ForkKnife, LogInIcon, LogIn, LogOut, Icon, HelpCircleIcon, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Camera, Upload, Receipt, Sparkles } from "lucide-react"
import FileUpload from "@/components/clientcomponents/fileUpload";


export default function Main() {
  const router = useRouter();
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('This Month'); // New state for period selection
  const [isUploading, setIsUploading] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const { user, loading, signOut, signInWithGoogle } = useAuth()

  // Time period options
  const periodOptions = ['Today', 'Weekly', 'This Month'];

  // Mock data for the pie chart
  const expenseData = [
    { name: 'Food & Dining', value: 200, color: '#2C7FFF' },
    { name: 'Transportation', value: 100, color: '#193CB8' },
    { name: 'Groceries', value: 65, color: '#8B5CF6' },
  ];

  // Mock transaction data
  const transactions = [
    {
      id: 1,
      venue: "McDonald's Pavilion KL",
      category: "Food & Dining",
      totalCost: 45.80,
      date: "2025-06-15",
      participants: 3,
      isSelected: false
    },
    {
      id: 2,
      venue: "Grab (KLCC to Home)",
      category: "Transportation",
      totalCost: 28.50,
      date: "2025-06-14",
      participants: 2,
      isSelected: false
    },
    {
      id: 3,
      venue: "Village Grocer",
      category: "Groceries",
      totalCost: 156.90,
      date: "2025-06-13",
      participants: 4,
      isSelected: false
    },
    {
      id: 4,
      venue: "Starbucks Mid Valley",
      category: "Food & Dining",
      totalCost: 32.40,
      date: "2025-06-12",
      participants: 2,
      isSelected: false
    },
    {
      id: 5,
      venue: "Shell Petrol Station",
      category: "Transportation",
      totalCost: 65.00,
      date: "2025-06-11",
      participants: 3,
      isSelected: false
    }
  ];

  // Mock user data
  const mockUsers = [
    {
      id: 1,
      name: "Sarah Chen",
      email: "sarah.chen@gmail.com",
      avatar: "SC"
    },
    {
      id: 2,
      name: "Ahmad Rahman",
      email: "ahmad.rahman@gmail.com",
      avatar: "AR"
    },
    {
      id: 3,
      name: "Emma Wong",
      email: "emma.wong@gmail.com",
      avatar: "EW"
    }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleTransactionSelection = (index) => {
    setSelectedTransactions(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleUserSelection = (userId) => {
    const user = mockUsers.find(u => u.id === userId);
    if (!user) return;

    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === userId);
      if (isSelected) {
        return prev.filter(u => u.id !== userId);
      } else {
        return [...prev, user];
      }
    });
  };

  // Get array of selected emails
  const getSelectedEmails = () => {
    return selectedUsers.map(user => user.email);
  };

  const handleLoginLogout = async () => {
    if (loading) {
      return;
    }

    if (user) {
      // User is logged in, so log them out
      try {
        await signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    } else {
      // User is not logged in, so sign them in
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error('Error signing in:', error);
      }
      
    }
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
                {loading ? (
                  <HelpCircleIcon /> // TODO: Loading Circle here 
                ) : (
                  <Button
                    className="bg-inherit shadow-none hover:bg-gray-100"
                    onClick={handleLoginLogout}
                    disabled={loading}
                  >
                    {user ? (
                      <LogOut className="text-red-500 w-5 h-5" />
                    ) : (
                      <ArrowRight className="text-purple-500 w-5 h-5" />
                    )}
                  </Button>
                )}

                <span className="h-fit bg-purple-500 text-white px-3 py-1 rounded-full text-sm w-fit">
                  Li Jie
                </span>
              </div>

              <p className="text-gray-500 text-sm mb-4">lijiebiz@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Time Period Selector */}
        <div className="mb-6">
          <div className="bg-gray-100 p-1 rounded-2xl flex">
            {periodOptions.map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${selectedPeriod === period
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* This Month Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">
                Total bill - {selectedPeriod}
              </p>
              <p className="text-2xl text-gray-900">MYR 365.10</p>
            </div>
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#D1D5DB"
                    dataKey="value"
                    stroke="none"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Legend */}
          <div className="mt-4 space-y-2">
            {expenseData.slice(0, 3).map((entry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm text-gray-700">{entry.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  MYR {entry.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* <div className="text-right mb-6">
          <p className="text-lg font-medium text-gray-900">Add to new bill</p>
        </div> */}

        {/* Add Bill Cards - Horizontally Scrollable */}
        <div className="overflow-x-auto pb-4 mb-8">
          <div className="flex space-x-4 min-w-max">
            {mockUsers.map((user, index) => {
              const isSelected = selectedUsers.some(u => u.id === user.id);
              return (
                <div key={user.id} className="w-32 flex-shrink-0">
                  <div
                    className={`rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${isSelected
                      ? 'bg-purple-100 border-2 border-purple-300'
                      : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <div className="mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mx-auto mb-2 ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-400 text-white'
                        }`}>
                        {user.avatar}
                      </div>
                      <p className="text-xs font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
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

        {/* Display selected emails for debugging */}
        {selectedUsers.length > 0 && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-purple-900 mb-1">Selected users:</p>
            <p className="text-xs text-purple-700">{getSelectedEmails().join(', ')}</p>
          </div>
        )}
      </div>

      {/* Your Transactions Section */}
      <div className="px-4 mb-20 bg-white">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Your transactions</h3>

        {/* Transaction List */}
        <div className="relative">
          <div className="space-y-3">
            {transactions
              .slice(0, showAllTransactions ? transactions.length : 3)
              .map((transaction, index) => (
                <div
                  key={transaction.id}
                  className={`rounded-2xl p-4 bg-white shadow-sm outline-1 outline-gray-100/80 transition-all duration-200 ${selectedTransactions.includes(index)
                    ? 'border-gray-200 '
                    : 'border-gray-100'
                    }`}
                >
                  <div className="flex flex-col w-full">
                    {/* Header with Venue and Total Cost */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="rounded-lg flex p-1">
                            <ForkKnife className="w-4 h-4 text-purple-500 stroke-2 fill-purple-300" />
                          </div>
                          <h4 className="text-gray-900 text-base font-medium">{transaction.venue}</h4>
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-3">
                        <div className="flex flex-col gap-3">
                          <div className="flex text-xl font-bold text-gray-700 ml-auto">
                            {formatCurrency(transaction.totalCost)}
                          </div>
                        </div>
                      </div>

                    </div>
                    {/* TODO: Dont hardcode total bill price*/}
                    {/* Details Row - Fixed Layout */}
                    <div className="flex flex-row w-full items-center space-x-6 mt-3 justify-between">
                      <div className="flex items-center">
                        <span className="text-xs">{formatDate(transaction.date)}</span>
                      </div>

                      <div className="flex flex-row items-center gap-2 text-xs">
                        <span className="">Total</span>
                        <span className=" font-semibold text-purple-400">
                          MYR 89.40
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Fade Effect and View More Button */}
          {!showAllTransactions && transactions.length > 3 && (
            <div className="relative">
              {/* Fade overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>

              {/* View More Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setShowAllTransactions(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <span>View more ({transactions.length - 3} more)</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Show Less Button */}
          {showAllTransactions && transactions.length > 3 && (
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
        </div>
      </div>

      {/* Uploading and taking camera picture of the receipt  */}
      <FileUpload
        isOpen={isFileUploadOpen}
        onClose={() => setIsFileUploadOpen(false)}
        selectedUsers={selectedUsers} // Pass the selected users here
      />

      <div className="mb-12 py-12" />

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md border-t border-gray-100 p-4">
        {/* Semi-transparent background */}
        <div className="absolute inset-0 bg-white opacity-70"></div>

        {/* Content with full opacity */}
        <div className="relative flex items-center justify-between">
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
            onClick={() => setIsFileUploadOpen(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-full font-medium hover:bg-purple-700 transition-colors"
          >
            Scan new receipt
          </button>
        </div>
      </div>
    </div>
  );
}