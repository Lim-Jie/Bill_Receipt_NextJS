"use client"

import React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

const AuthContext = createContext({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export async function getUserPhoneNumber(user) {
    if (!user) {
        return null;
    }
    try {
        const { data, error } = await supabase
            .from('users')
            .select('phone')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error('Error fetching user phone:', error);
            return user.email; // Fallback to email
        }
        
        return data?.phone || user.email; // Return phone or fallback to email
    } catch (error) {
        console.error('Database query error:', error);
        return user.email; // Fallback to email
    }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes (without showing toasts)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      // Removed toast notifications from here
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        toast.error("Failed to sign in with Google")
        throw error
      }
      // Show success toast immediately after successful OAuth initiation
      toast.success("Redirecting to Google...")
    } catch (error) {
      toast.error("An error occurred during sign in")
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error("Failed to sign out")
        throw error
      }
      // Show success toast immediately after successful sign out
      toast.success("Logged out successfully!")
    } catch (error) {
      toast.error("An error occurred during sign out")
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
