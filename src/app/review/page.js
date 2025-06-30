"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Edit3, Users, Sun, Sunset, Moon, CloudSun, Stars, CameraIcon, Camera, CameraOff, SwitchCamera, Check, ScanIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

// interface ReceiptItem {
//   id: number
//   name: string
//   price: number
//   quantity: number
//   nett_price: number
// }

// interface ReceiptData {
//   structured_data: string
// }

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();

  // Add ordinal suffix
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
};

const formatTime = (timeStr) => {
  const [hour, minute] = timeStr.split(':');
  const hourNum = parseInt(hour);
  const period = hourNum >= 12 ? 'pm' : 'am';
  const displayHour = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum);

  return `${displayHour}.${minute} ${period}`;
};

const getTimeOfDayInfo = (timeStr) => {
  const hour = parseInt(timeStr.split(':')[0]);

  if (hour >= 5 && hour < 12) {
    return {
      period: 'Morning',
      icon: Sun,
      iconColor: 'text-yellow-500'
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      period: 'Afternoon',
      icon: CloudSun,
      iconColor: 'text-orange-500'
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      period: 'Evening',
      icon: Sunset,
      iconColor: 'text-orange-600'
    };
  } else {
    return {
      period: 'Night',
      icon: Moon,
      iconColor: 'text-indigo-600'
    };
  }
};

export default function ReviewPage() {
  const [receiptData, setReceiptData] = useState(null)
  const [items, setItems] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [isAnimated, setIsAnimated] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [animationKey, setAnimationKey] = useState(Date.now()) // Add unique key
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [calculatedDifference, setCalculatedDifference] = useState(0);
  useEffect(() => {
    const evaluateBillNettPrice = (structured) => {
      // Calculate difference using the structured data directly
      const items = structured.items;
      const itemsNettPrice = items.reduce((sum, item) => {
        return sum + (item.nett_price * item.quantity);
      }, 0)
      //The rounding_adj is already assigned to the first item in the bill
      const difference = Number((itemsNettPrice - structured.nett_amount).toFixed(2));

      if (difference !== 0) {
        console.log("THE BILL IS NOT CORRECTLY SPLIT")
        console.log("Calculated itemsNettPrice", itemsNettPrice)
      } else {
        console.log("THE BILL IS CORRECTLY SPLIT")
      }

      return difference; // Return the difference value
    }

    const loadData = async () => {
      // Force fresh animation state with unique key
      setAnimationKey(Date.now())
      setIsAnimated(false)
      setIsMounted(true)

      const data = localStorage.getItem("receiptData")
      if (data) {
        const parsed = JSON.parse(data)
        console.log("Raw receipt data from localStorage:", parsed)

        try {
          const structured = JSON.parse(parsed.structured_data)
          setReceiptData(structured)
          setItems(structured.items || [])
          setSelectedUsers(parsed.selected_users || [])
          console.log("Selected users:", parsed.selected_users)

          // Calculate the difference and set it
          const differenceOfNettPrice = evaluateBillNettPrice(structured);
          setCalculatedDifference(differenceOfNettPrice)
        } catch (error) {
          console.error("Error parsing structured data:", error)
        }
      } else {
        console.log("No receipt data found in localStorage")
      }
      setIsLoading(false)

      // Use longer timeout to ensure smooth animation
      const animationTimer = setTimeout(() => {
        setIsAnimated(true)
      }, 150)

      return () => clearTimeout(animationTimer)
    }

    loadData();
  }, []) // Empty dependency array ensures this runs on every mount

  // Force component refresh when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setIsAnimated(false)
      setAnimationKey(Date.now())
    }

    // Listen for route changes
    router.events?.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])

  const handleContinue = () => {
    if (receiptData) {
      console.log("Passing bill data to split_bill:", receiptData)

      localStorage.setItem("split_bill_receiptData", JSON.stringify({
        receiptData
      }))

      console.log("Updated billData with latest receipt data")
    }
    router.push("/split_bill")
  }

  if (isLoading || !receiptData || !isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      key={animationKey} // Force re-render with unique key
      className={`min-h-screen transition-transform duration-[1200ms] ease-out ${isAnimated ? 'translate-x-0' : '-translate-x-full'
        }`}
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-purple-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-2.5 space-y-2">
        {/* Items List */}
        <Card className="p-4 bg-white/80 shadow-none border-0 shadow-md mt-5">
          <div className="flex flex-col space-y-2">
            {/* Title */}
            <h2 className="text-xl text-gray-900">{receiptData.name}</h2>

            {/* Date and Time with Time-based Icon */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-gray-600 text-sm gap-4">
                <span className="px-2 py-1 text-xs rounded-lg bg-gray-200 text-gray-700">
                  {receiptData.category}
                </span>
                <p>{formatDate(receiptData.date)}</p>
                <p>{formatTime(receiptData.time)}</p>
              </div>

              {/* Time of day indicator */}
              <div className={``}>
                {(() => {
                  const timeInfo = getTimeOfDayInfo(receiptData.time);
                  const IconComponent = timeInfo.icon;
                  return (
                    <>
                      <IconComponent className={`w-4 h-4 ${timeInfo.iconColor}`} />
                    </>
                  );
                })()}
              </div>


            </div>

            {/* Selected Users Section - Add this after the edit button */}
            {selectedUsers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center gap-2 mb-3">
                  {
                    selectedUsers.length === 1 ? (
                      <h3 className="text-xs font-medium text-gray-600">1 Friend added  : </h3>
                    ) : (
                      <h3 className="text-xs font-medium text-gray-600">{selectedUsers.length} Friends added  : </h3>
                    )
                  }
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user, index) => (
                    <Badge key={index} variant="secondary" className="py-1  rounded-2xl outline-1 outline-gray-200/60 bg-white  shadow-md">
                      {user.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Category and Edit button */}
            {/* <div className="flex items-center ml-auto">
              <Button onClick={() => router.push("/edit")}
                className="bg-inherit shadow-none text-purple-600 text-xs">
                Edit bill
              </Button>
            </div> */}
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col">
                <div className="flex items-center justify-between p-3 bg-gray-50/60 rounded-lg outline-1 outline-gray-200/60">
                  <div className="flex flex-row w-2/3 gap-2">
                    <p className="flex flex-row text-xs text-white bg-purple-500 w-fit h-fit px-2 py-1 rounded-lg shrink-0">x {item.quantity}</p>
                    <p className="font-medium text-blue-900">{item.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="flex flex-row font-semibold text-gray-900 shrink-0">MYR {item.nett_price.toFixed(2)}</p>
                    {item.price !== item.nett_price && (
                      <p className="text-xs text-purple-400/80 line-through">Pre-tax: <br /> MYR {item.price.toFixed(2)}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col text-xs text-gray-400 gap-0.5 mt-[10px]">
                  {item.rounding_adj && (
                    <span>
                      Incl Rounding Adj: RM{item.rounding_adj}
                    </span>
                  )}
                  {item.error_diff && (
                    <span>
                      Unbilled offset (tax split): RM{item.error_diff}
                    </span>
                  )}
                </div>
              </div>


            ))}

            <div className="flex flex-row justify-between items-center">
              <h3 className="text-xs text-gray-500">{items.length} items found</h3>

              <Button onClick={() => router.push("/edit")}
                className="bg-inherit shadow-none text-purple-600 text-xs">
                Edit bill
              </Button>

            </div>
          </div>
        </Card>

        {/* Bill Summary */}
        <div className="p-4 bg-white/80 backdrop-blur-sm border-none outline-none">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>MYR {receiptData.subtotal_amount?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span>MYR {receiptData.tax_amount?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Charge</span>
              <span>MYR {receiptData.service_charge_amount?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rounding adj</span>
              <span>MYR {receiptData.rounding_adj?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-gray-900">MYR {receiptData.nett_amount?.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-4 items-center mb-5">
          <span className={`rounded-2xl px-2.5 py-1.5 text-xs font-medium ${calculatedDifference === 0
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            }`}>
            {calculatedDifference === 0 ? (
              <>
                <Check className="w-3 h-3 mr-1 inline" /> Bill is accurate
              </>
            ) : (
              <>
                Error difference = RM{calculatedDifference?.toFixed(2) || "0.00"}
              </>
            )}
          </span>


          <span className={` outline-1 flex flex-row font-bold items-center gap-1 text-gray-700 rounded-2xl px-2.5 py-1.5 text-xs w-fit ${(() => {
            const confidence = receiptData.confidence_score?.toFixed(2) * 100 || 0;
            if (confidence >= 80) return 'bg-white-300 outline-gray-300';
            if (confidence >= 50) return 'bg-yellow-300 outline-yellow-300';
            return 'bg-orange-300 outline-orange-300';
          })()
            }`}>
            <ScanIcon width={13} height={13} />
            {receiptData.confidence_score?.toFixed(2) * 100 || "0.00"}%
          </span>
        </div>
        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          className="w-full h-12 rounded-xl bg-purple-500 "
        >
          Continue to Split
        </Button>
      </div>
    </div>
  )
}
