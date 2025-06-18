"use client"

import { useState, useEffect } from "react"
import { Camera, Upload, Users, Receipt, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

export default function FileUpload({ isOpen, onClose, selectedUsers = [] }) {
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

            // Call your Next.js API route instead of the backend directly
            const response = await fetch("/api/analyze-receipt", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error("API route error:", errorData)
                throw new Error(`API error: ${response.status} - ${errorData.error}`)
            }

            const data = await response.json()
            console.log("Received data from API:", data)

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

            // Store selected users along with receipt data
            const receiptDataWrapper = {
                raw_text: data.raw_text,
                structured_data: JSON.stringify(structuredData),
                selected_users: selectedUsers
            }

            localStorage.setItem("receiptData", JSON.stringify(receiptDataWrapper))
            console.log("Stored receipt data with selected users, navigating to review page")
            onClose()
            router.push("/review")
        } catch (error) {
            console.error("Error processing receipt:", error)

            alert(`Failed to process receipt: ${error.message}. Using sample data instead.`)

            // Use mock data with selected users
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
                selected_users: selectedUsers
            }

            localStorage.setItem("receiptData", JSON.stringify(mockData))
            onClose()
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
            const file = (e.target).files?.[0]
            if (file) handleFileUpload(file)
        }
        input.click()
    }

    const handleGallerySelect = () => {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = "image/*"
        input.onchange = (e) => {
            const file = (e.target).files?.[0]
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

    if (!user || !isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md mx-auto bg-white">
                <CardHeader className="flex flex-row justify-between">
                    <CardTitle className="flex items-center gap-2 pr-12 justify-between">
                        <Receipt className="w-6 h-6 text-purple-500" />
                        Scan Receipt
                    </CardTitle>
                    
                    <button
                        onClick={onClose}
                        className=" p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            <p className="text-sm font-medium text-blue-800">AI-Powered Processing</p>
                        </div>
                        <p className="text-xs text-blue-600">
                            Our AI will automatically read your receipt and extract items, prices, and tax information.
                        </p>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <Button
                        onClick={handleCameraCapture}
                        disabled={isUploading}
                        className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                    >
                        <Camera className="w-5 h-5 mr-2" />
                        {isUploading ? "Processing..." : "Take Photo"}
                    </Button>

                    <Button
                        onClick={handleGallerySelect}
                        disabled={isUploading}
                        variant="outline"
                        className="w-full p-4 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
                    >
                        <Upload className="w-5 h-5 mr-2" />
                        Choose from Gallery
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
