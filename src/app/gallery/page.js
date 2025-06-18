"use client"

import { useState, useEffect } from "react"
import { Camera, Upload, Users, Receipt, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

export default function HomePage() {
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleFileUpload = async (file) => {
    if (!user) {
      router.push("/login")
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      console.log("Sending image to backend for processing...")

      const response = await fetch("http://0.0.0.0:8000/analyze-receipt", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Backend error:", errorText)
        throw new Error(`Backend error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Received data from backend:", data)

      // Parse structured data
      let structuredData
      try {
        structuredData =
          typeof data.structured_data === "string"
            ? JSON.parse(data.structured_data)
            : data.structured_data
        console.log("Parsed structured data:", structuredData)
      } catch (parseError) {
        console.error("Error parsing structured data:", parseError)
        console.error("Raw structured_data:", data.structured_data)
        throw new Error("Invalid JSON response from backend")
      }

      structuredData.paid_by = user.email
      if (structuredData.participants && structuredData.participants.length > 0) {
        structuredData.participants[0].email = user.email
      }

      const receiptDataWrapper = {
        raw_text: data.raw_text,
        structured_data: JSON.stringify(structuredData),
      }

      localStorage.setItem("receiptData", JSON.stringify(receiptDataWrapper))
      console.log("Stored receipt data, navigating to review page")
      router.push("/review")
    } catch (error) {
      console.error("Error processing receipt:", error)

      alert(`Failed to process receipt: ${error.message}. Using sample data instead.`)

      const mockData = {
        raw_text: "Mock OCR text from receipt (backend unavailable)...",
        structured_data: JSON.stringify({
          bill_id: "BILL20250606-001",
          name: "Italian Bistro @Hartamas",
          date: "2025-06-05",
          time: "14:01",
          category: "Food",
          tax_rate: 0.06,
          service_charge_rate: 0.1,
          subtotal_amount: 88.0,
          tax_amount: 5.28,
          service_charge_amount: 8.8,
          nett_amount: 102.08,
          paid_by: user.email,
          items: [
            {
              id: 1,
              name: "Pasta Carbonara",
              price: 18.0,
              tax_amount: 2.88,
              nett_price: 20.88,
              quantity: 1,
              consumed_by: [],
            },
            {
              id: 2,
              name: "Margherita Pizza",
              price: 15.0,
              tax_amount: 2.4,
              nett_price: 17.4,
              quantity: 1,
              consumed_by: [],
            },
            {
              id: 3,
              name: "Margherita Pizza",
              price: 15.0,
              tax_amount: 2.4,
              nett_price: 17.4,
              quantity: 1,
              consumed_by: [],
            },
            {
              id: 4,
              name: "Wine Bottle",
              price: 40.0,
              tax_amount: 6.4,
              nett_price: 46.4,
              quantity: 1,
              consumed_by: [],
            },
          ],
          split_method: "item_based",
          participants: [
            {
              email: user.email,
              total_paid: 102.08,
              items_paid: [
                { id: 1, percentage: 100, value: 20.88 },
                { id: 2, percentage: 100, value: 17.4 },
                { id: 3, percentage: 100, value: 17.4 },
                { id: 4, percentage: 100, value: 46.4 },
              ],
            },
            {
              email: "lijiebiz@gmail.com",
              total_paid: 0,
              items_paid: [],
            },
            {
              email: "charlie@gmail.com",
              total_paid: 0,
              items_paid: [],
            },
          ],
          notes: "Includes 10% service charge and 6% GST. Consumers to be assigned.",
        }),
      }

      localStorage.setItem("receiptData", JSON.stringify(mockData))
      router.push("/review")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCameraCapture = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.capture = "environment"
    input.onchange = (e) => {
      const file = (e.target ).files?.[0]
      if (file) handleFileUpload(file)
    }
    input.click()
  }

  const handleGallerySelect = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target ).files?.[0]
      if (file) handleFileUpload(file)
    }
    input.click()
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="text-gray-600">
            ← Dashboard
          </Button>
          <h1 className="font-semibold text-gray-900">New Receipt</h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Scan Receipt</h1>
          <p className="text-gray-600">Take a photo or choose from gallery to get started</p>
        </div>

        <div className="space-y-4 mb-8">
          <Card className="p-6 border-0 shadow-sm bg-white">
            <Button
              onClick={handleCameraCapture}
              disabled={isUploading}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-xl text-lg font-medium ios-button"
            >
              <Camera className="w-6 h-6 mr-3" />
              {isUploading ? "Processing..." : "Take Photo"}
            </Button>
          </Card>

          <Card className="p-6 border-0 shadow-sm bg-white">
            <Button
              onClick={handleGallerySelect}
              disabled={isUploading}
              variant="outline"
              className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-lg font-medium ios-button"
            >
              <Upload className="w-6 h-6 mr-3" />
              Choose from Gallery
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-gray-700">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gray-600" />
            </div>
            <span className="font-medium">AI-powered receipt scanning</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <span className="font-medium">Easy friend management</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Receipt className="w-4 h-4 text-gray-600" />
            </div>
            <span className="font-medium">Smart bill splitting</span>
          </div>
        </div>
      </div>
    </div>
  )
}
