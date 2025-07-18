import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function GET(request) {
  // 1) auth
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) pagination params
  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '4', 10)
  const page  = parseInt(url.searchParams.get('page')  || '1', 10)
  const offset = (page - 1) * limit

  // 3) fetch friendships & total count using range instead of offset
  const start = offset
  const end = offset + limit - 1
  const { data, count, error } = await supabaseAdmin
    .from('friendships')
    .select(
      `user1_id,
       user2_id,
       created_at,
       nett_balance,
       user1:users!friendships_user1_id_fkey(id,name,phone),
       user2:users!friendships_user2_id_fkey(id,name,phone)`,
      { count: 'exact' }
    )
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .range(start, end)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 4) pick the "other" user and normalize nett_balance from current user's perspective
  const friends = (data || []).map(f => {
    const isMe1 = f.user1_id === user.id
    const other = isMe1 ? f.user2 : f.user1
    
    // Normalize balance from current user's perspective:
    // If current user is user1: use nett_balance as-is
    // If current user is user2: flip the sign
    const userPerspectiveBalance = isMe1 ? f.nett_balance : -f.nett_balance
    
    return {
      id: other.id,
      name: other.name,
      phone: other.phone,
      since: f.created_at,
      nett_balance: userPerspectiveBalance,
      // Optional: include original IDs for debugging
      user1_id: f.user1_id,
      user2_id: f.user2_id
    }
  })

  return NextResponse.json({
    friends,
    page,
    total: count || 0
  })
}