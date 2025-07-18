"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Edit3, Users, Sun, Sunset, Moon, CloudSun, Stars, CameraIcon, Camera, CameraOff, SwitchCamera, Check, ScanIcon, SearchIcon, PlusIcon, MessageCircle, ForwardIcon, InfoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import SubmitReceiptButton from "@/test"
import ReceiptCard from "@/components/ReceiptCard"



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

// const getTimeOfDayInfo = (timeStr) => {
//   const hour = parseInt(timeStr.split(':')[0]);

//   if (hour >= 5 && hour < 12) {
//     return {
//       period: 'Morning',
//       icon: Sun,
//       iconColor: 'text-yellow-500'
//     };
//   } else if (hour >= 12 && hour < 17) {
//     return {
//       period: 'Afternoon',
//       icon: CloudSun,
//       iconColor: 'text-orange-500'
//     };
//   } else if (hour >= 17 && hour < 20) {
//     return {
//       period: 'Evening',
//       icon: Sunset,
//       iconColor: 'text-orange-600'
//     };
//   } else {
//     return {
//       period: 'Night',
//       icon: Moon,
//       iconColor: 'text-indigo-600'
//     };
//   }
// };

const divideItemsEqually = (receiptData) => {
  try {
    const data = { ...receiptData };
    const participants = data.participants || [];

    if (participants.length === 0) {
      return "Error: No participants found";
    }

    // Calculate equal share of the total nett_amount
    const totalAmount = data.nett_amount;
    const baseShare = Math.floor((totalAmount * 100) / participants.length) / 100; // Round down to nearest cent
    const remainder = Math.round((totalAmount * 100) % participants.length); // Remaining cents

    // console.log(`Dividing total amount ${totalAmount} equally among ${participants.length} participants`);
    // console.log(`Base share per person: ${baseShare}, remaining cents to distribute: ${remainder}`);

    // Reset all participants
    for (let participant of participants) {
      participant.items_paid = [];
      participant.total_paid = 0.0;
    }

    // Assign equal shares with remainder distribution
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];

      // Base share + 1 cent for first 'remainder' participants
      let participantShare = baseShare;
      if (i < remainder) {
        participantShare += 0.01;
      }

      participant.total_paid = Math.round(participantShare * 100) / 100;

      // Create items_paid entries (proportional to original items)
      const itemsTotal = data.items.reduce((sum, item) => sum + item.nett_price, 0);

      for (let item of data.items) {
        const itemProportion = item.nett_price / itemsTotal;
        const itemShare = Math.round(participantShare * itemProportion * 100) / 100;

        const share = {
          id: item.id,
          value: itemShare,
          percentage: 100 / participants.length,
          split_type: "equal",
          original_price: item.nett_price
        };
        participant.items_paid.push(share);
      }

      // console.log(`Participant ${participant.phone || 'unknown'}: $${participant.total_paid}`);
    }

    data.split_method = "equal_split";

    // Verify the total matches
    const totalSplit = participants.reduce((sum, p) => sum + p.total_paid, 0);
    const difference = Math.round((totalSplit - totalAmount) * 100) / 100;

    // console.log(`Total split: ${totalSplit}, Original total: ${totalAmount}, Difference: ${difference}`);

    if (Math.abs(difference) < 0.01) {
      console.log("✅ Equal split is accurate");
    } else {
      console.log("❌ Equal split has rounding error, but should be minimal");
    }

    return data;

  } catch (error) {
    console.error("Error dividing items equally:", error);
    return "Error: Failed to divide items equally";
  }
};

// Remove the evaluateChatSplitting call from divideItemsEqually since we're now splitting the nett_amount directly
export default function ReviewPage() {
  const [receiptData, setReceiptData] = useState(null)
  const [items, setItems] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [isAnimated, setIsAnimated] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [animationKey, setAnimationKey] = useState(Date.now())
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [calculatedDifference, setCalculatedDifference] = useState(0);
  const [billDivided, setBillDivided] = useState(false); // Add this state

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

      const data = localStorage.getItem("jomsplit_receiptData")
      if (data) {
        const parsed = JSON.parse(data)

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


  // Update the handleQuickMessage function
  const handleQuickMessage = (message) => {
    if (message.includes("divide the bill equally") && receiptData) {
      console.log("Dividing bill equally among participants...");
      const updatedData = divideItemsEqually(receiptData);

      if (typeof updatedData === 'object') {
        // Update the state first
        setReceiptData(updatedData);

        // Immediately save to localStorage (don't rely on useEffect timing)
        localStorage.setItem("jomsplit_receiptJSON", JSON.stringify({
          receiptData: updatedData
        }));

        // Set the divided state to true to show the green tick
        setBillDivided(true);

        console.log("Bill divided equally and saved to localStorage");
        console.log("Updated data:", updatedData);
      } else {
        console.error("Error dividing bill:", updatedData);
      }
    }
  };


  const handleContinue = () => {
    if (receiptData) {
      console.log("Passing bill data to split_bill:", receiptData)

      localStorage.setItem("jomsplit_receiptJSON", JSON.stringify({
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
      key={animationKey}
      className={`max-w-md mx-auto min-h-screen transition-transform duration-[1200ms] ease-out ${isAnimated ? 'translate-x-0' : '-translate-x-full'}`}
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


      <div className="px-5 mt-7">
        <h1 className="font-semibold text-3xl text-purple-600">
          1. Select your friends
        </h1>
      </div>


      <div className="flex flex-row items-center mt-5 px-5 gap-3">
        <div className="flex flex-row items-center bg-gray-100 rounded-3xl w-full p-3 text-gray-400 gap-3">
          <SearchIcon width={16} height={16} /> Tag friends
        </div>
        <span className="outline-1 outline-gray-300 rounded-3xl p-2 text-xs w-fit h-fit">
          <PlusIcon width={16} height={16} />
        </span>
      </div>



      <div className="flex px-5">
        {/* Selected Users Section - Add this after the edit button */}
        {selectedUsers.length > 0 && (
          <div className="flex gap-2 pt-5">
            {selectedUsers.map((user, index) => (
              <Badge key={index} variant="secondary" className="py-1  rounded-2xl outline-1 outline-gray-200/60 bg-white shadow-md">
                {user.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="px-5 mt-9">
        <h1 className="font-semibold text-3xl text-purple-600">
          2. Select how to split the bill
        </h1>
      </div>

      <div className="mt-4 space-y-2 px-3">
        <button
          onClick={() => handleQuickMessage("Can you divide the bill equally?")}
          className={`block w-full text-left p-3 outline-1 outline-gray-200 rounded-lg text-md transition-colors ${billDivided
              ? 'bg-green-100 hover:bg-green-100 border-green-200 outline-white text-gray-700'
              : 'hover:bg-blue-50'
            }`}
        >
          <span className="flex w-full items-center justify-between">
            <span className="flex items-center">
              💰 Divide the bill equally
              {billDivided && (
                <Check className="w-4 h-4 ml-2 text-green-600" />
              )}
            </span>
          </span>
        </button>

        <button
          onClick={handleContinue}
          className="block w-full text-left p-3 outline-1 outline-gray-200 hover:bg-blue-50 rounded-lg text-md transition-colors"
        >
          <span className="flex w-full items-center justify-between whitespace-nowrap">
            Split based on items
            <div className="flex justify-center items-center bg-white w-8 h-8 rounded-lg">
              <ForwardIcon className="" />
            </div>
          </span>
        </button>
      </div>



      <div className="px-5 mt-9">
        <h1 className="font-semibold text-3xl text-purple-600">
          3. Review the bill
        </h1>
      </div>

      {/* separator line */}
      <div className="w-full h-[1px] bg-gray-200 mt-5"></div>


      <div className="px-4 py-2.5 pt-0 space-y-2">
        {/* Items List */}
        <ReceiptCard className="mt-10">
          <div className="flex flex-col space-y-2">
            {/* Title */}
            <h2 className="text-xl text-gray-900">{receiptData.name}</h2>

            {/* Date and Time with Time-based Icon */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-gray-400 text-sm gap-4">
                <span className="px-2 py-1 text-xs rounded-lg outline-1 outline-gray-200 text-gray-700">
                  {receiptData.category}
                </span>
                <p>{formatDate(receiptData.date)}</p>
                <p>{formatTime(receiptData.time)}</p>
              </div>

              {/* <div className={``}>
                {(() => {
                  const timeInfo = getTimeOfDayInfo(receiptData.time);
                  const IconComponent = timeInfo.icon;
                  return (
                    <>
                      <IconComponent className={`w-4 h-4 ${timeInfo.iconColor}`} />
                    </>
                  );
                })()}
              </div> */}
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col p-3 rounded-lg outline-1 outline-gray-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex flex-row w-2/3 gap-2">
                    <p className="flex flex-row text-xs bg-gray-200 font-bold text-gray-800 w-fit h-fit px-2 py-1 rounded-lg shrink-0">x {item.quantity}</p>
                    <p className="font-medium text-gray-900">{item.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="flex flex-row font-semibold text-gray-900 shrink-0">MYR {item.nett_price.toFixed(2)}</p>
                    {item.price !== item.nett_price && (
                      <p className="text-xs text-white line-through">Pre-tax: <br /> MYR {item.price.toFixed(2)}</p>
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
        </ReceiptCard>

        {/* Bill Summary */}
        <div className="p-4 bg-white/80 backdrop-blur-sm border-none outline-none">
          <div className="space-y-2 text-sm">
            {/* <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>MYR {receiptData.subtotal_amount?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span>MYR {receiptData.tax_amount?.toFixed(2) || "0.00"}</span>
            </div>
            {receiptData.service_charge_amount !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Service Charge</span>
                <span>MYR {receiptData.service_charge_amount?.toFixed(2) || "0.00"}</span>
              </div>
            )}
            {receiptData.rounding_adj !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Rounding adj</span>
                <span>MYR {receiptData.rounding_adj?.toFixed(2) || "0.00"}</span>
              </div>
            )} */}
            <div className="flex justify-between font-bold text-xl text-purple-700">
              <span className="">Total  </span>
              <span className="flex flex-row gap-3 items-center">MYR {receiptData.nett_amount?.toFixed(2) || "0.00"} <InfoIcon className="stroke-gray-600" width={16} height={16} /></span>
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-4 items-center mb-5">
          <span className={`rounded-2xl px-2.5 py-1.5 text-xs font-medium outline-1 outline-gray-200
            }`}>
            {calculatedDifference === 0 ? (
              <>
                <Check className="w-3 h-3 mr-1 inline stroke-green-500" /> Bill is accurate
              </>
            ) : (
              <>
                Error difference = RM{calculatedDifference?.toFixed(2) || "0.00"}
              </>
            )}
          </span>


          <span className={` outline-1 flex flex-row font-bold items-center gap-1 text-gray-700 rounded-2xl px-2.5 py-1.5 text-xs w-fit ${(() => {
            const confidence = receiptData.confidence_score?.toFixed(2) * 100 || 0;
            if (confidence >= 80) return 'bg-white outline-gray-200';
            if (confidence >= 50) return 'bg-yellow-300 outline-yellow-300';
            return 'bg-orange-300 outline-orange-300';
          })()
            }`}>
            <ScanIcon width={13} height={13} />
            {receiptData.confidence_score?.toFixed(2) * 100 || "0.00"}%
          </span>
        </div>
        {/* Continue Button */}
        {/* <Button
          // onClick={handleContinue}
            onClick={()=>{}}

          className="w-full h-12 rounded-xl bg-gray-100 border border-gray-100 text-gray-900 "
        >
          <MessageCircle className="w-8 h-8 mr-2 fill-green-300 stroke-2 stroke-white" />
          WhatsApp bill
        </Button> */}


        <SubmitReceiptButton billData={receiptData} />
      </div>
    </div>
  )
}
