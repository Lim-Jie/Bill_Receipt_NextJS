import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '5')
  
  try {
    console.log('receipts ▶️ received GET')

    // grab the Bearer token
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization')
    console.log('receipts ▶️ auth header:', authHeader)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('receipts ❌ missing token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // verify user
    const {
      data: { user },
      error: userErr
    } = await supabaseAdmin.auth.getUser(token)
    console.log('receipts ▶️ auth.getUser →', { user: user?.id, userErr })
    if (userErr || !user) {
      console.log('receipts ❌ invalid session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    console.log('receipts ▶️ fetching for user:', user.id, 'page:', page, 'limit:', limit)

    // Fetch receipts where user is a consumer with pagination
    const { data: receiptsData, error: receiptsError } = await supabaseAdmin
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
      .order('receipts(created_at)', { ascending: false })
      .range(offset, offset + limit - 1)

    if (receiptsError) {
      console.error('receipts ❌ Error fetching receipts:', receiptsError)
      return NextResponse.json({ error: 'Failed to fetch receipts: ' + receiptsError.message }, { status: 500 })
    }

    console.log('receipts ▶️ found', receiptsData?.length, 'receipts')

    // Get total count for pagination info
    const { count, error: countError } = await supabaseAdmin
      .from('receipt_consumers')
      .select('receipt_id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('receipts ❌ Error getting receipt count:', countError)
      // Don't fail the request for count error, just estimate
    }

    // Transform the data to flatten the receipts structure
    const transformedReceipts = receiptsData?.map(item => ({
      id: item.receipts.id,
      user_id: item.receipts.user_id,
      bill_id: item.receipts.bill_id,
      name: item.receipts.name,
      category: item.receipts.category,
      notes: item.receipts.notes,
      tax_rate: item.receipts.tax_rate,
      service_charge_rate: item.receipts.service_charge_rate,
      subtotal_amount: item.receipts.subtotal_amount,
      tax_amount: item.receipts.tax_amount,
      service_charge_amount: item.receipts.service_charge_amount,
      nett_amount: item.receipts.nett_amount,
      paid_by: item.receipts.paid_by,
      split_method: item.receipts.split_method,
      date: item.receipts.date,
      time: item.receipts.time,
      file_url: item.receipts.file_url,
      created_at: item.receipts.created_at,
      updated_at: item.receipts.updated_at,
      location_name: item.receipts.location_name,
      address: item.receipts.address,
      total_paid: item.total_paid

    })) || []

    const total = count || transformedReceipts.length
    const hasMore = total > offset + limit
    const totalPages = Math.ceil(total / limit)

    console.log('receipts ✅ returning', transformedReceipts.length, 'receipts, hasMore:', hasMore)

    return NextResponse.json({
      receipts: transformedReceipts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    })

  } catch (error) {
    console.error('receipts ❌ Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}