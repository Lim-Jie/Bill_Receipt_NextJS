import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    // Get auth header
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization')
    
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token)
      if (!userErr && user) {
        currentUser = user;
      }
    }

    // Fetch specific receipt
    const { data: receiptData, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .select(`
        id,
        user_id,
        bill_id,
        name,
        category,
        notes,
        tax_rate,
        service_charge_rate,
        subtotal_amount,
        tax_amount,
        service_charge_amount,
        nett_amount,
        paid_by,
        split_method,
        date,
        time,
        file_url,
        created_at,
        updated_at,
        location_name,
        address,
        items_object,
        participants_object
      `)
      .eq('id', id)
      .single()

    if (receiptError || !receiptData) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // If user is authenticated, get their receipt consumer data
    let userReceiptData = null;
    if (currentUser) {
      const { data: consumerData, error: consumerError } = await supabaseAdmin
        .from('receipt_consumers')
        .select('total_paid, breakdown')
        .eq('receipt_id', id)
        .eq('user_id', currentUser.id)
        .single()

      if (!consumerError && consumerData) {
        userReceiptData = consumerData;
      }
    }

    const response = {
      receipt: receiptData,
      userShare: userReceiptData
    };

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}