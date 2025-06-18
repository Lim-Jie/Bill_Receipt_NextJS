import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a singleton instance to avoid multiple clients
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseInstance
})()

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          bill_id: string
          name: string
          date: string
          time: string
          category: string
          tax_rate: number
          service_charge_rate: number
          subtotal_amount: number
          tax_amount: number
          service_charge_amount: number
          nett_amount: number
          paid_by: string
          items: any
          participants: any
          split_method: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bill_id: string
          name: string
          date: string
          time: string
          category: string
          tax_rate?: number
          service_charge_rate?: number
          subtotal_amount: number
          tax_amount: number
          service_charge_amount: number
          nett_amount: number
          paid_by: string
          items: any
          participants: any
          split_method?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bill_id?: string
          name?: string
          date?: string
          time?: string
          category?: string
          tax_rate?: number
          service_charge_rate?: number
          subtotal_amount?: number
          tax_amount?: number
          service_charge_amount?: number
          nett_amount?: number
          paid_by?: string
          items?: any
          participants?: any
          split_method?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invited_emails: {
        Row: {
          id: string
          user_id: string
          email: string
          name: string | null
          invited_at: string
          last_used_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          name?: string | null
          invited_at?: string
          last_used_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          name?: string | null
          invited_at?: string
          last_used_at?: string
        }
      }
    }
  }
}
