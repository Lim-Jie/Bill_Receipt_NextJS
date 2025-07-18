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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token)
    
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch specific receipt
    const { data: receiptData, error: receiptError } = await supabaseAdmin
      .from('receipt_consumers')
      .select(`
        receipt_id,
        total_paid,
        breakdown,
        receipts!inner (
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
          address
        )
      `)
      .eq('user_id', user.id)
      .eq('receipt_id', id)
      .single()

    if (receiptError || !receiptData) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Transform the data
    const transformedReceipt = {
      id: receiptData.receipts.id,
      user_id: receiptData.receipts.user_id,
      bill_id: receiptData.receipts.bill_id,
      name: receiptData.receipts.name,
      category: receiptData.receipts.category,
      notes: receiptData.receipts.notes,
      tax_rate: receiptData.receipts.tax_rate,
      service_charge_rate: receiptData.receipts.service_charge_rate,
      subtotal_amount: receiptData.receipts.subtotal_amount,
      tax_amount: receiptData.receipts.tax_amount,
      service_charge_amount: receiptData.receipts.service_charge_amount,
      nett_amount: receiptData.receipts.nett_amount,
      paid_by: receiptData.receipts.paid_by,
      split_method: receiptData.receipts.split_method,
      date: receiptData.receipts.date,
      time: receiptData.receipts.time,
      file_url: receiptData.receipts.file_url,
      created_at: receiptData.receipts.created_at,
      updated_at: receiptData.receipts.updated_at,
      location_name: receiptData.receipts.location_name,
      address: receiptData.receipts.address,
      total_paid: receiptData.total_paid,
      breakdown: receiptData.breakdown
    }

    return NextResponse.json({ receipt: transformedReceipt })

  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}