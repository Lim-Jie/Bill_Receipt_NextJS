"use client"

import { useState, useEffect } from "react"
import { Camera, Upload, Users, Receipt, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { toast } from "sonner"

//TODO: dont hardcode the participants email
// const participants = [
//     { "name": "Alice", "email": "alice@example.com" },
//     { "name": "Bob", "email": "bob@example.com" }
// ];

// Example: Direct client-side API call
async function analyzeReceipt(file, participants, email) {
    try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append('participants', JSON.stringify(participants));
        formData.append("email", email)

        console.log("participants: ", JSON.stringify(participants))
        // Call your backend API directly
        const response = await fetch('/api/backend/analyze-receipt', {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error calling backend directly:', error);
        throw error;
    }
}

const ProcessingCountdown = ({ isProcessing }) => {
    const [countdown, setCountdown] = useState(5);
    //COUNTDOWN DEFAULT TO 4 SECONDS FROM FILE UPLOAD 

    useEffect(() => {
        if (!isProcessing) {
            setCountdown(5);
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isProcessing]);

    if (!isProcessing) return 0;

    return (
        <div>
            Processing... {countdown}s
        </div>
    );
};

export default function FileUpload({ isOpen, onClose, selectedUsers = [] }) {
    const [isUploading, setIsUploading] = useState(false)
    const router = useRouter()
    const { user, loading } = useAuth()

    const handleFileUpload = async (file) => {
        setIsUploading(true)

        try {
            //GET USER EMAIL ELSE IF RETURN NULL WHEN USER IS NOT LOGGED IN
            const email = user?.email || "";

            //GET THE JSON RETRIEVED FROM SCANNIGN THE RECEIPT
            const data = await analyzeReceipt(file, selectedUsers, email);
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
            
             router.push("/review")
            
        } catch (error) {
            console.error("Error processing receipt:", error)

            alert(`Failed to process receipt: ${error.message}. Using sample data instead.`)

            onClose()
            // router.push("/review")
            toast.warning("We couldn't capture your image data, please try again")
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

    if (!isOpen) return null

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-500 ease-in-out `}>
            <Card className={`w-full max-w-md mx-auto bg-white transition-all duration-500 ease-in-out`}>
                <CardHeader className="flex flex-row justify-between">
                    <CardTitle className="flex items-center gap-2 pr-12 justify-between">
                        <Receipt className="w-6 h-6 text-purple-500" />
                        Scan Receipt
                    </CardTitle>

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
                        disabled={isUploading }
                        className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50"
                    >
                        <Camera className="w-5 h-5 mr-2" />
                        {isUploading ?
                            <ProcessingCountdown isProcessing={isUploading} />
                            : "Take Photo"}
                    </Button>

                    <Button
                        onClick={handleGallerySelect}
                        disabled={isUploading }
                        variant="outline"
                        className="w-full p-4 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl disabled:opacity-50"
                    >
                        <Upload className="w-5 h-5 mr-2" />
                        Choose from Gallery
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
