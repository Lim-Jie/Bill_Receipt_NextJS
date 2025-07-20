"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Mail, MessageCircle, Check, Copy, HomeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { sendEmail, generateBillSplitEmail } from "@/lib/email-service"

export default function SubmitReceiptButton({ billData: propBillData }) {

    const [billData, setBillData] = useState(propBillData || null)
    const [sendingNotifications, setSendingNotifications] = useState(false)
    const [notificationsSent, setNotificationsSent] = useState(false)
    const [savingReceipt, setSavingReceipt] = useState(false)
    const [countdown, setCountdown] = useState(null)
    const { user } = useAuth()
    const router = useRouter();

    useEffect(() => {
    console.log("Test page mounted/updated");
    }, []); // Only logs on mount


    // Countdown effect
    useEffect(() => {
        if (notificationsSent && countdown === null) {
            setCountdown(3)
        }
    }, [notificationsSent, countdown])

    // Separate countdown timer effect
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(prev => prev - 1)
            }, 1000)
            
            return () => clearTimeout(timer)
        } else if (countdown === 0) {
            // Navigate when countdown reaches 0
            router.push("/")
        }
    }, [countdown, router])

    const saveReceiptToDatabase = useCallback(
    async () => {

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
            console.log("✅ Parsed structured data:", structured);

            const payload = {
                user_id: user.id,
                bill_id: structured.bill_id,
                name: structured.name,
                category: structured.category,
                notes: structured.notes,
                tax_rate: structured.tax_rate,
                service_charge_rate: structured.service_charge_rate,
                subtotal_amount: structured.subtotal_amount,
                tax_amount: structured.tax_amount,
                service_charge_amount: structured.service_charge_amount,
                nett_amount: structured.nett_amount,
                paid_by: user.id,
                split_method: structured.split_method,
                date: structured.date,
                time: structured.time,
                location_name: structured.location_name,
                address: structured.address,
                items_object: structured.items,
                participants_object: structured.participants
            };

            console.log("📝 Inserting receipt payload:", payload);

            const { data: receiptData, error: receiptError } = await supabase
                .from("receipts")
                .insert([payload])
                .select()
                .single();

            if (receiptError) {
                console.error("❌ Supabase insert receipts error:", receiptError);
                toast.error(`Failed to save receipt: ${receiptError.message}`);
                setSavingReceipt(false);
                return;
            }

            console.log("📥 receiptData returned:", receiptData);

            // Insert items
            const itemsToInsert = structured.items.map((item, idx) => ({
                item_id: idx + 1,
                receipt_id: receiptData.id,
                name: item.name,
                price: item.price,
            }));

            const { error: itemsError } = await supabase
                .from("receipt_items")
                .insert(itemsToInsert);

            if (itemsError) {
                console.error("❌ receipt_items insert error:", itemsError);
                throw new Error(itemsError.message);
            }
            console.log(`🔍 Entire JSON Structure for TEST.js Submission`, structured);

            // Insert into receipt_consumers using the user_ids we already have
            const consumersToInsert = structured.participants.map(p => {
                const [smallestId, biggestId] = [p.user_id, user.id].sort();
                let friendshipId = null;
                if (smallestId !== biggestId) {
                    friendshipId = `${smallestId}_${biggestId}`;
                }
                console.log(`🔍 Creating consumer: user=${p.user_id}, friendship=${friendshipId}`);
                return {
                    receipt_id: receiptData.id,
                    user_id: p.user_id,  // Use the user_id we set earlier
                    friendship_id: friendshipId,
                    total_paid: p.total_paid,
                    category: receiptData.category || "unknown",
                    breakdown: p.breakdown || null,
                }
            });


            const { error: consumersError } = await supabase
                .from("receipt_consumers")
                .insert(consumersToInsert);

            if (consumersError) {
                console.error("❌ receipt_consumers insert error:", consumersError);
                console.error("participants", structured.participants)
                console.error("consumersToInsert", consumersToInsert)
                throw new Error(consumersError.message);
            }

            toast.success("Saved in database ✅ ")
            console.log("✅ Receipt save process completed successfully")

        } catch (error) {
            console.error("❌ Error in saveReceiptToDatabase:", error);
            toast.warning("Failed to save receipt. Please try again.");
        } finally {
            setSavingReceipt(false)
            console.log("🏁 saveReceiptToDatabase process finished")
        }
     }, [user, billData]) // Only depend on user and billData


    const sendNotifications = useCallback(
        async () => {
        console.log("📨 sendNotifications called")
        setSendingNotifications(true)

        try {
            if (!billData || !user) {
                throw new Error("Missing required data for sending notifications")
            }
            await saveReceiptToDatabase()

            setSendingNotifications(false)
            setNotificationsSent(true)

        } catch (error) {
            console.error("❌ Error in sendNotifications:", error)
            setSendingNotifications(false)
            toast.error("Failed to send email notifications. Please try again.")
        }
    }, [billData, user, saveReceiptToDatabase])


    if (!billData) {
        console.log("⏳ No splitData available, showing loading screen")
        return (
            <>
                <Button
                    onClick={() => { }}
                    className="w-full p-5 flex flex-row gap-3 justify-center items-center rounded-xl bg-gray-100 border border-gray-100 text-gray-900"
                >
                    <p className="text-gray-400 text-xs">Please reupload, data not found</p>
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
                </Button>
            </>
        )
    }


    return (
        <div className=" bg-gray-50">
            <Button
                onClick={() => {
                    console.log("📨 Send notifications button clicked")
                    sendNotifications()
                }}
                disabled={sendingNotifications || notificationsSent || savingReceipt}
                className="w-full h-12 rounded-xl bg-gray-100 border border-gray-100 text-gray-900"
            >
                {sendingNotifications || savingReceipt ? (
                    <>
                        <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                        {savingReceipt ? "Saving..." : "Sending Notifications..."}
                    </>
                ) : notificationsSent ? (
                    <div className="flex items-center space-x-2">
                        <Check className="w-5 h-5" />
                        <span>Notifications Sent</span>
                        {countdown !== null && countdown > 0 && (
                            <div className="flex items-center space-x-1">
                                <span className="text-gray-500">•</span>
                                <span className="text-sm text-gray-600">
                                    Redirecting in {countdown}s
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <MessageCircle className="w-8 h-8 mr-2 fill-green-300 stroke-2 stroke-white" />
                        WhatsApp bill
                    </>
                )}
            </Button>
        </div>
    )
}