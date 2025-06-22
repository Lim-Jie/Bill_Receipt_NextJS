"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Mail, MessageCircle, Check, Copy, HomeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { sendEmail, generateBillSplitEmail } from "@/lib/email-service"

export default function TestPage() {
    console.log("🚀 TestPage component initialized")

    const [billData, setBillData] = useState(null)
    const [sendingNotifications, setSendingNotifications] = useState(false)
    const [notificationsSent, setNotificationsSent] = useState(false)
    const [savingReceipt, setSavingReceipt] = useState(false)
    const router = useRouter()
    const { user } = useAuth()

    console.log("👤 User state:", user)
    console.log("📊 Component states:", {
        splitData: billData,
        sendingNotifications,
        notificationsSent,
        savingReceipt
    })

    useEffect(() => {
        const storedData = localStorage.getItem("split_bill_receiptData");

        if (storedData) {
            const parsed = JSON.parse(storedData);
            const receiptJSONData = parsed.receiptData;
            console.log("Receipt data received in split_bill:", receiptJSONData);
            setBillData(receiptJSONData || null)

        } else {
            console.log("No receipt JSON found");
        }

    }, [])

    const saveReceiptToDatabase = async () => {
        console.log("💾 saveReceiptToDatabase called")
        console.log("👤 User check:", user)
        console.log("📊 SplitData check:", billData)

        if (!user) {
            console.log("❌ Cannot save receipt - missing user")
            return
        } else if (!billData) {
            console.log("❌ No receiptData found in localStorage")
            return
        }
        setSavingReceipt(true)
        console.log("🔄 Starting receipt save process")
        try {
            const structured = billData;
            console.log("✅ Parsed structured data:", structured)

            const receiptToInsert = {
                user_id: user.id,
                bill_id: structured.bill_id,
                name: structured.name,
                date: structured.date,
                time: structured.time,
                category: structured.category,
                tax_rate: structured.tax_rate,
                service_charge_rate: structured.service_charge_rate,
                subtotal_amount: structured.subtotal_amount,
                tax_amount: structured.tax_amount,
                service_charge_amount: structured.service_charge_amount,
                nett_amount: structured.nett_amount,
                paid_by: structured.paid_by,
                items: structured.items,
                participants: structured.participants,
                split_method: structured.split_method,
                notes: structured.notes,
            }
            console.log("📄 Receipt data to insert:", receiptToInsert)

            const { error } = await supabase.from("receipts").insert(receiptToInsert)

            if (error) {
                console.error("❌ Supabase insert error:", error)
                throw error
            }

            console.log("✅ Receipt inserted successfully")

            // Save invited emails
            console.log("📧 Processing invited emails...")

            const emailsToSave = billData.participants
                .filter((participants) => {
                    console.log(`🔍 Checking split email: ${participants.email} vs user email: ${user.email}`)
                    return participants.email !== user.email
                })
                .map((participants) => {
                    const emailData = {
                        user_id: user.id,
                        email: participants.email,
                        name: participants.name,
                    }
                    console.log("📧 Email data to save:", emailData)
                    return emailData
                })

            console.log("📧 Final emails to save:", emailsToSave)

            if (emailsToSave.length > 0) {
                const { error: emailError } = await supabase.from("invited_emails").upsert(emailsToSave, {
                    onConflict: "user_id,email",
                })

                if (emailError) {
                    console.error("❌ Error saving invited emails:", emailError)
                } else {
                    console.log("✅ Invited emails saved successfully")
                }
            } else {
                console.log("ℹ️ No emails to save")
            }

            toast.success("Your receipt has been saved to your account.")
            console.log("✅ Receipt save process completed successfully")

        } catch (error) {
            console.error("❌ Error in saveReceiptToDatabase:", error)
            toast.warning("Failed to save receipt. Please try again.")
        } finally {
            setSavingReceipt(false)
            console.log("🏁 saveReceiptToDatabase process finished")
        }
    }

    const sendNotifications = async () => {
        console.log("📨 sendNotifications called")
        setSendingNotifications(true)

        try {
            // Save receipt first
            console.log("💾 Calling saveReceiptToDatabase first...")
            await saveReceiptToDatabase()

            if (!billData || !user) {
                throw new Error("Missing required data for sending notifications")
            }

            // Get participants excluding the current user
            const participantsToNotify = billData.participants.filter(
                (participant) => participant.email !== user.email
            )

            console.log("📧 Participants to notify:", participantsToNotify)

            // Send email to each participant
            const emailPromises = participantsToNotify.map(async (participant) => {
                try {
                    console.log(`📨 Sending email to ${participant.email}`)
                    
                    // Get participant's items
                    const participantItems = participant.items || []
                    const formattedItems = participantItems.map(item => ({
                        name: item.name || "Unknown item",
                        price: item.nett_price || item.price || 0
                    }))

                    // Generate email HTML
                    const emailHtml = generateBillSplitEmail(
                        participant.name || participant.email,
                        billData.name || "Restaurant Bill",
                        billData.nett_amount || 0,
                        billData.participants.find(p => p.email === participant.email)?.total_paid || 0,
                        formattedItems,
                        user.user_metadata?.name || user.email || "Someone"
                    )

                    // Send the email
                    await sendEmail({
                        to: participant.email,
                        subject: `Bill Split: ${billData.name || "Restaurant Bill"} - Your share: $${(participant.amount || 0).toFixed(2)}`,
                        html: emailHtml
                    })

                    console.log(`✅ Email sent successfully to ${participant.email}`)
                } catch (emailError) {
                    console.error(`❌ Failed to send email to ${participant.email}:`, emailError)
                    throw emailError
                }
            })

            // Wait for all emails to be sent
            await Promise.all(emailPromises)

            setSendingNotifications(false)
            setNotificationsSent(true)
            console.log("✅ All notifications sent successfully")

            toast.success(`Email notifications sent to ${participantsToNotify.length} participant(s)!`)

        } catch (error) {
            console.error("❌ Error in sendNotifications:", error)
            setSendingNotifications(false)
            toast.error("Failed to send email notifications. Please try again.")
        }
    }

    // const copyShareLink = () => {
    //     console.log("📋 copyShareLink called")
    //     console.log("📊 SplitData for sharing:", splitData)

    //     // Handle both data structures
    //     const participants = splitData?.splits || splitData?.participants || []

    //     const shareText = `Bill Split Summary for ${splitData?.name}\n\n${participants
    //         .map((participant) => {
    //             // Handle different data structures
    //             const name = participant.nickname || participant.name || participant.email
    //             const amount = participant.amount || participant.total_paid || 0
    //             return `${name}: $${amount.toFixed(2)}`
    //         })
    //         .join("\n")}\n\nTotal: $${(splitData?.nett_amount || 0).toFixed(2)}`

    //     console.log("📋 Share text generated:", shareText)

    //     navigator.clipboard.writeText(shareText)
    //     console.log("✅ Text copied to clipboard")

    //     toast({
    //         title: "Copied to clipboard!",
    //         description: "Share this summary with your friends.",
    //     })
    // }

    console.log("🎨 Rendering component with splitData:", billData)

    if (!billData) {
        console.log("⏳ No splitData available, showing loading screen")
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading summary...</p>
                </div>
            </div>
        )
    }

    // Check if we have participants or splits data
    const participants = billData.participants || []

    // if (participants.length === 0) {
    //     console.log("❌ No participants found in splitData")
    //     return (
    //         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    //             <div className="text-center p-4">
    //                 <p className="text-gray-600 font-medium mb-4">No split data found</p>
    //                 <Button onClick={startNewSplit} className="bg-black text-white">
    //                     Start New Split
    //                 </Button>
    //             </div>
    //         </div>
    //     )
    // }


    return (
        <div className=" bg-gray-50">
            {/* Header */}
            {/* <div className="bg-white border-b border-gray-200">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            console.log("⬅️ Back button clicked")
                            router.back()
                        }}
                        className="text-gray-600"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="font-semibold text-gray-900">Bill Summary</h1>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            console.log("📋 Copy button clicked")
                            //   copyShareLink()
                        }}
                        className="text-gray-600"
                    >
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
            </div> */}

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* Success Header */}
                {/* <Card className="p-6 bg-black text-white border-0 shadow-sm text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Bill Split Complete!</h2>
                    <p className="opacity-90">Your bill has been successfully divided</p>
                </Card>
                //Restaurant info
                <Card className="p-4 bg-white border-0 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-2">{splitData.name || "Unknown Restaurant"}</h3>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="text-2xl font-bold text-gray-900">
                            ${(splitData.nett_amount || 0).toFixed(2)}
                        </span>
                    </div>
                </Card> */}

                {/* Individual Splits */}
                {/* <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Individual Amounts</h3>
          {participants.map((participant, index) => {
            console.log(`🧾 Rendering participant ${index}:`, participant)
            
            // Handle different data structures
            const email = participant.email || `participant-${index}`
            const name = participant.nickname || participant.name || participant.email || "Unknown"
            const amount = participant.amount || participant.total_paid || 0
            const items = participant.items || participant.items_paid || []
            
            return (
              <Card key={email} className="p-4 bg-white border-0 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{name}</p>
                    <p className="text-sm text-gray-600">{email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</p>
                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                      {items.length} items
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  {items.map((item, itemIndex) => {
                    console.log(`📦 Item ${itemIndex} for participant ${index}:`, item)
                    
                    // Handle different item structures
                    let itemName = "Unknown item"
                    let itemPrice = 0
                    
                    if (item.name) {
                      // Standard item structure
                      itemName = item.name
                      itemPrice = item.nett_price || item.price || 0
                    } else if (item.id) {
                      // items_paid structure - find the item in splitData.items
                      const fullItem = splitData.items?.find(i => i.id === item.id)
                      if (fullItem) {
                        itemName = fullItem.name
                        itemPrice = item.value || fullItem.nett_price || fullItem.price || 0
                      }
                    }
                    
                    return (
                      <div key={itemIndex} className="flex justify-between text-sm text-gray-600">
                        <span>{itemName}</span>
                        <span>${itemPrice.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div> */}

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                    <button
                        onClick={() => {
                            console.log("📨 Send notifications button clicked")
                            sendNotifications()
                        }}
                        disabled={sendingNotifications || notificationsSent || savingReceipt}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-2xl text-sm shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
                    >

                        {sendingNotifications || savingReceipt ? (
                            <div className="flex flex-row items-center justify-center gap-5">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {savingReceipt ? "Saving..." : "Sending Notifications..."}
                            </div>
                        ) : notificationsSent ? (
                            <div className="flex flex-row items-center justify-center gap-5">
                                <Check className="w-5 h-5" />
                                Notifications Sent
                            </div>
                        ) : (
                            <div className="flex flex-row items-center justify-center gap-5">
                                <Mail className="w-5 h-5" />
                                Send Email Notifications
                            </div>
                        )}
                    </button>

                    <div className="flex flex-row">
                        <Button
                            variant="outline"
                            onClick={() => console.log("💬 WhatsApp button clicked")}
                            className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-medium ios-button"
                        >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => {router.push("/")}}
                        className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-medium ios-button"
                    >
                        <HomeIcon className="w-4 h-4 mr-2" />
                        Home
                    </Button>
                </div>
            </div>
        </div>
    )
}