import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(request) {
  try {
    console.log('add-friend ▶️ received POST')

    // grab the Bearer token
    const headerStore = headers()
    const authHeader = headerStore.get('authorization')
    console.log('add-friend ▶️ auth header:', authHeader)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('add-friend ❌ missing token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // verify user
    const {
      data: { user },
      error: userErr
    } = await supabaseAdmin.auth.getUser(token)
    console.log('add-friend ▶️ auth.getUser →', { user, userErr })
    if (userErr || !user) {
      console.log('add-friend ❌ invalid session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1) Make sure the authenticated user exists in your `public.users` table
    const { error: upsertCurrentErr } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0]
        },
        { onConflict: 'id' }
      )
    if (upsertCurrentErr) throw upsertCurrentErr

    // parse body
    const { phone = '', name = '' } = await request.json()
    const trimmed = phone.trim()
    if (!trimmed) {
      console.log('add-friend ❌ invalid phone')
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }
    const friendName = name.trim() || 'Unknown'
    const fallbackEmail = trimmed.replace(/\D/g, '') + '@no-reply.local'


    // 2) Check if phone number already exists
    const { data: existingUser, error: checkErr } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('phone', trimmed)
      .single()
    
    if (checkErr && checkErr.code !== 'PGRST116') { // PGRST116 = no rows found
      throw checkErr
    }

    let friendUser
    if (existingUser) {
      // Phone number exists, use existing user without modifying
      console.log('add-friend ▶️ phone exists, using existing user')
      friendUser = existingUser
    } else {
      // Phone number doesn't exist, create new user
      console.log("USER PHONE NOT FOUND ")
      console.log("CREATING USER ")
      const { data: newUser, error: insertErr } = await supabaseAdmin
        .from('users')
        .insert(
          { phone: trimmed, 
            name: friendName,
            email: fallbackEmail,
            invited_by : user.id,
            is_active: false,
          }
        )
        .select('id')
        .single()
      if (insertErr) throw insertErr
      
      friendUser = newUser
    }
    const [smallerId, largerId] = [user.id, friendUser.id].sort();

    // Use two equal checks instead of having eq and OR operation
    const { count, error: existErr } = await supabaseAdmin
      .from('friendships')
      .select('id', { head: true })
      .eq('user1_id', smallerId)
      .eq('user2_id', largerId)
  
    console.log('add-friend ▶️ existing count:', count, existErr)
    if (existErr) throw existErr
    if (count > 0) {
      console.log('add-friend ❌ already friends')
      return NextResponse.json({ error: 'You are already friends' }, { status: 400 })
    }

    // Determine which nickname field belongs to the current user
    const isCurrentUserSmaller = user.id === smallerId;
    const currentUserNickname = null; // Current user's nickname for the friend (null by default)
    const friendNickname = friendName; // The nickname the current user gives to their friend

    // insert friendship
    const { error: insertErr } = await supabaseAdmin
      .from('friendships')
      .insert(
        { 
          id: `${smallerId}_${largerId}`,
          user1_id: smallerId, 
          user2_id: largerId,
          user1_nickname: isCurrentUserSmaller ? currentUserNickname : friendNickname,
          user2_nickname: isCurrentUserSmaller ? friendNickname : currentUserNickname,
          invited_by: user.id
        }
      )
    console.log('add-friend ▶️ insertErr:', insertErr)
    if (insertErr){
      throw new Error("Friend already exist");
    }

    console.log('add-friend ✅ success')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('add-friend 💥 error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}