// hooks/useReceiptData.js
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/auth-provider";

// Helper function to check if a date is within the selected period
const isDateInPeriod = (dateStr, period) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    switch (period) {
        case "Today":
            return date.getDate() === now.getDate() && 
                   date.getMonth() === now.getMonth() && 
                   date.getFullYear() === now.getFullYear();
        case "Weekly":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date >= weekAgo;
        case "This Month":
        default:
            return date.getMonth() === now.getMonth() && 
                   date.getFullYear() === now.getFullYear();
    }
};

// Helper function to process expense data for the pie chart
const processExpenseData = (receiptsData) => {
    const categoryTotals = {};
    let total = 0;

    receiptsData.forEach((receipt) => {
        const category = receipt.category || "Other";
        const amount = receipt.nett_amount || 0;

        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        total += amount;
    });

    const colors = ["#2C7FFF", "#193CB8", "#8B5CF6", "#F59E0B", "#EF4444", "#10B981"];
    const chartData = Object.entries(categoryTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
    }));

    return { chartData, totalAmount: total };
};

export function useReceiptData(selectedPeriod) {
    const { user, loading: authLoading } = useAuth();
    const [allReceipts, setAllReceipts] = useState([]);
    const [invitedEmails, setInvitedEmails] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load all data once on mount or when user changes
    useEffect(() => {
        const loadUserData = async () => {
            if (!user || authLoading) {
                setAllReceipts([]);
                setInvitedEmails([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // TODO: Do pagination  
                // Get all receipts for the user without date filtering
                const { data: receiptsData, error: receiptsError } = await supabase
                    .from("receipts")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (receiptsError) throw receiptsError;

                setAllReceipts(receiptsData || []);

            } catch (error) {
                console.error("Error loading user data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [user, authLoading]);

    // Filter receipts based on selected period using client-side filtering
    const filteredReceipts = useMemo(() => {
        return allReceipts.filter(receipt => 
            isDateInPeriod(receipt.created_at, selectedPeriod)
        );
    }, [allReceipts, selectedPeriod]);

    // Calculate expense data based on filtered receipts
    const { chartData, totalAmount } = useMemo(() => 
        processExpenseData(filteredReceipts), 
    [filteredReceipts]);

    // Function to fetch invited emails
    const fetchInvitedEmails = useCallback(async () => {
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('invited_emails')
                .select('*')
                .eq('user_id', user.id)
                .order('last_used_at', { ascending: false });
                
            if (error) throw error;
            setInvitedEmails(data || []);
        } catch (error) {
            console.error('Error fetching invited emails:', error);
        }
    }, [user]);

    // Function to refetch invited emails - exposed to component
    const refetchInvitedEmails = useCallback(async () => {
        await fetchInvitedEmails();
    }, [fetchInvitedEmails]);

    // Use the fetchInvitedEmails in your useEffect
    useEffect(() => {
        // Fetch invited emails
        fetchInvitedEmails();
        
        // ... rest of your code
    }, [selectedPeriod, user, fetchInvitedEmails]);

    return {
        receipts: filteredReceipts,
        invitedEmails,
        expenseData: chartData,
        totalAmount,
        loading,
        refetchInvitedEmails
    };
}

// Export formatting functions
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency: "MYR",
        minimumFractionDigits: 2,
    }).format(amount);
};

export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
};