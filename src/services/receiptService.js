import { supabase } from '@/lib/supabase';

/**
 * Receipt Service
 * 
 * This module provides client-side functions for managing receipt operations.
 * It handles API communication for receipt-related data fetching and operations.
 */

/**
 * Receipt detail response interface
 * @typedef {Object} ReceiptDetailResponse
 * @property {Object} receipt - The complete receipt data
 * @property {Object|null} userShare - User's share data if authenticated
 */

/**
 * Fetches detailed information for a specific receipt by ID
 * 
 * @param {string} receiptId - The unique identifier of the receipt
 * @returns {Promise<ReceiptDetailResponse>} Promise that resolves to receipt details
 * @throws {Error} When the request fails or receipt is not found
 * 
 * @example
 * ```javascript
 * try {
 *   const receiptData = await fetchReceiptDetail('receipt-123');
 *   console.log(receiptData.receipt.name);
 * } catch (error) {
 *   console.error('Failed to fetch receipt:', error.message);
 * }
 * ```
 */
export const fetchReceiptDetail = async (receiptId) => {
  if (!receiptId) {
    throw new Error('Receipt ID is required');
  }

  try {
    // Get the current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('Session error:', sessionError);
    }

    // Prepare request headers
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if session exists
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Make API request to fetch receipt details
    const response = await fetch(`/api/receipts/${receiptId}`, {
      method: 'GET',
      headers,
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to fetch receipt details';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    // Parse and return the response data
    const data = await response.json();
    
    // Validate response structure
    if (!data.receipt) {
      throw new Error('Invalid response format: missing receipt data');
    }

    return data;

  } catch (error) {
    // Log error for debugging
    console.error('Error in fetchReceiptDetail:', error);
    
    // Re-throw with more specific error message if needed
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server');
    }
    
    throw error;
  }
};
