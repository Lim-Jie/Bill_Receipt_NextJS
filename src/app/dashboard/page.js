"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera, Upload, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

// interface Receipt {
//   id: string
//   name: string
//   date: string
//   nett_amount: number
//   category: string
//   created_at: string
// }

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [receipts, setReceipts] = useState([])
  const [loadingReceipts, setLoadingReceipts] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchReceipts()
    }
  }, [user])

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("id, name, date, nett_amount, category, created_at")
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setReceipts(data || [])
    } catch (error) {
      console.error("Error fetching receipts:", error)
    } finally {
      setLoadingReceipts(false)
    }
  }

  const handleNewReceipt = () => {
    router.push("/gallery")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {user.user_metadata?.name || user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-600 hover:text-gray-900">
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Quick Actions */}
        <Card className="p-6 bg-white border-0 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Receipt</h2>
          <div className="space-y-3">
            <Button
              onClick={handleNewReceipt}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white font-medium rounded-xl"
            >
              <Camera className="w-5 h-5 mr-3" />
              Take Photo
            </Button>
            <Button
              onClick={handleNewReceipt}
              variant="outline"
              className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl"
            >
              <Upload className="w-5 h-5 mr-3" />
              Choose from Gallery
            </Button>
          </div>
        </Card>

        {/* Recent Receipts */}
        <Card className="p-6 bg-white border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Receipts</h2>
            <Button variant="ghost" size="sm" className="text-gray-600">
              View All
            </Button>
          </div>

          {loadingReceipts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : receipts.length > 0 ? (
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <div className="w-5 h-5 bg-gray-500 rounded-sm"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{receipt.name}</p>
                      <p className="text-sm text-gray-600">{new Date(receipt.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${receipt.nett_amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{receipt.category}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-2">No receipts yet</p>
              <p className="text-sm text-gray-500">Start by taking a photo of your first receipt</p>
            </div>
          )}
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
            <div className="text-sm text-gray-600">This Month</div>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
            <div className="text-sm text-gray-600">Friends</div>
          </Card>
        </div>
      </div>
    </div>
  )
}
