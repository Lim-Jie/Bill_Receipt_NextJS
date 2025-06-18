"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, UserPlus, Send, Edit3, Trash2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// Remove this import
// import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

// Replace the DragDropContext implementation with simple touch interactions

// interface BillItem {
//   id: number
//   name: string
//   price: number
//   quantity: number
//   nett_price: number
//   assignedTo: string[]
// }

// interface Person {
//   email: string
//   name: string
//   nickname: string
//   color: string
// }

const PERSON_COLORS = [
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
]

export default function SplitPage() {
  const [billData, setBillData] = useState(null)
  const [items, setItems] = useState([])
  const [people, setPeople] = useState([])
  const [newPersonEmail, setNewPersonEmail] = useState("")
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [editingNickname, setEditingNickname] = useState(null)
  const [tempNickname, setTempNickname] = useState("")
  const router = useRouter()
  const [assignedTotal, setAssignedTotal] = useState(0)
  const [canFinalize, setCanFinalize] = useState(false)
  const { user } = useAuth()
  const [suggestedEmails, setSuggestedEmails] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const [isInitialized, setIsInitialized] = useState(false)

  const loadSuggestedEmails = useCallback(async () => {
    if (!user) return

    try {
      console.log("Loading suggested emails for user:", user.id)
      const { data, error } = await supabase
        .from("invited_emails")
        .select("email, name")
        .eq("user_id", user.id)
        .order("last_used_at", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Error loading suggested emails:", error)
        return
      }

      const emails = data?.map((item) => item.email) || []
      console.log("Loaded suggested emails:", emails)
      setSuggestedEmails(emails)
    } catch (error) {
      console.error("Error loading suggested emails:", error)
    }
  }, [user])

  const saveEmailToSuggestions = async (email) => {
    if (!user) return

    try {
      console.log("Saving email to suggestions:", email)
      const { error } = await supabase.from("invited_emails").upsert(
        {
          user_id: user.id,
          email: email,
          name: email.split("@")[0],
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,email",
        },
      )

      if (error) {
        console.error("Error saving email suggestion:", error)
      } else {
        console.log("Successfully saved email suggestion")
        // Reload suggestions to get the updated list
        await loadSuggestedEmails()
      }
    } catch (error) {
      console.error("Error saving email suggestion:", error)
    }
  }

  const filterSuggestions = useCallback(
    (input) => {
      if (!input.trim()) {
        setFilteredSuggestions(suggestedEmails.slice(0, 5))
        return
      }

      const filtered = suggestedEmails
        .filter(
          (email) => email.toLowerCase().includes(input.toLowerCase()) && !people.find((p) => p.email === email), // Don't suggest already added people
        )
        .slice(0, 5)

      setFilteredSuggestions(filtered)
    },
    [suggestedEmails, people],
  )

  // Save state to localStorage whenever it changes
  const saveStateToStorage = useCallback(
    (newItems, newPeople) => {
      if (!isInitialized) return // Don't save during initial load

      const stateToSave = {
        items: newItems,
        people: newPeople,
        timestamp: Date.now(),
      }
      localStorage.setItem("splitPageState", JSON.stringify(stateToSave))
      console.log("Saved split page state:", stateToSave)
    },
    [isInitialized],
  )

  // Load state from localStorage
  const loadStateFromStorage = useCallback(() => {
    try {
      const savedState = localStorage.getItem("splitPageState")
      if (savedState) {
        const parsed = JSON.parse(savedState)
        console.log("Loaded split page state:", parsed)
        return parsed
      }
    } catch (error) {
      console.error("Error loading state from storage:", error)
    }
    return null
  }, [])

  useEffect(() => {
    // First try to get the most recent receipt data (which includes edits)
    const receiptData = localStorage.getItem("receiptData")
    const billData = localStorage.getItem("billData")

    let dataToUse = null

    if (receiptData) {
      // Use receipt data if available (this includes any edits)
      try {
        const parsed = JSON.parse(receiptData)
        const structured = JSON.parse(parsed.structured_data)
        dataToUse = structured
        console.log("Using updated receipt data from edit screen")
      } catch (error) {
        console.error("Error parsing receipt data:", error)
      }
    }

    // Fallback to billData if receiptData is not available
    if (!dataToUse && billData) {
      try {
        dataToUse = JSON.parse(billData)
        console.log("Using original bill data")
      } catch (error) {
        console.error("Error parsing bill data:", error)
      }
    }

    if (dataToUse) {
      setBillData(dataToUse)

      // Try to load saved state first
      const savedState = loadStateFromStorage()

      if (savedState && savedState.items && savedState.people) {
        // Use saved state if available
        setItems(savedState.items)
        setPeople(savedState.people)
        console.log("Restored from saved state")
      } else {
        // Initialize fresh state with the most recent data
        const initialItems =
          dataToUse.items?.map((item) => ({
            ...item,
            assignedTo: [],
          })) || []
        setItems(initialItems)

        // Initialize people from participants with nicknames
        const initialPeople =
          dataToUse.participants?.slice(0, 3).map((p, index) => ({
            email: p.email,
            name: p.email.split("@")[0],
            nickname: p.email.split("@")[0], // Default nickname
            color: PERSON_COLORS[index % PERSON_COLORS.length],
          })) || []
        setPeople(initialPeople)
        console.log("Initialized fresh state with updated data")
      }
    }

    // Load suggested emails when component mounts
    if (user) {
      loadSuggestedEmails()
    }

    setIsInitialized(true)
  }, [user, loadSuggestedEmails, loadStateFromStorage])

  // Save state whenever items or people change
  useEffect(() => {
    if (isInitialized && items.length > 0) {
      saveStateToStorage(items, people)
    }
  }, [items, people, saveStateToStorage, isInitialized])

  // Update filtered suggestions when suggestedEmails changes
  useEffect(() => {
    filterSuggestions(newPersonEmail)
  }, [suggestedEmails, newPersonEmail, filterSuggestions])

  const addPerson = async () => {
    if (newPersonEmail && !people.find((p) => p.email === newPersonEmail)) {
      const newPerson = {
        email: newPersonEmail,
        name: newPersonEmail.split("@")[0],
        nickname: newPersonEmail.split("@")[0],
        color: PERSON_COLORS[people.length % PERSON_COLORS.length],
      }
      const newPeople = [...people, newPerson]
      setPeople(newPeople)

      // Save email to suggestions
      await saveEmailToSuggestions(newPersonEmail)

      setNewPersonEmail("")
      setShowAddPerson(false)
      setShowSuggestions(false)
    }
  }

  const addSuggestedPerson = async (email) => {
    if (!people.find((p) => p.email === email)) {
      const newPerson = {
        email: email,
        name: email.split("@")[0],
        nickname: email.split("@")[0],
        color: PERSON_COLORS[people.length % PERSON_COLORS.length],
      }
      const newPeople = [...people, newPerson]
      setPeople(newPeople)

      // Update last_used_at for this email
      await saveEmailToSuggestions(email)

      setNewPersonEmail("")
      setShowAddPerson(false)
      setShowSuggestions(false)
    }
  }

  const updateNickname = (email, nickname) => {
    const newPeople = people.map((person) => (person.email === email ? { ...person, nickname } : person))
    setPeople(newPeople)
    setEditingNickname(null)
    setTempNickname("")
  }

  const startEditingNickname = (email, currentNickname) => {
    setEditingNickname(email)
    setTempNickname(currentNickname)
  }

  const toggleItemAssignment = (itemId, personEmail) => {
    const newItems = items.map((item) => {
      if (item.id === itemId) {
        const isAssigned = item.assignedTo.includes(personEmail)
        return {
          ...item,
          assignedTo: isAssigned
            ? item.assignedTo.filter((email) => email !== personEmail)
            : [...item.assignedTo, personEmail],
        }
      }
      return item
    })
    setItems(newItems)
  }

  const calculatePersonTotal = useCallback(() => {
    return items.reduce((total, item) => {
      if (item.assignedTo.includes(personEmail)) {
        return total + item.nett_price / item.assignedTo.length
      }
      return total
    }, 0)
  }, [items])

  useEffect(() => {
    calculatePersonTotal()
  }, [calculatePersonTotal])

  const handleFinalize = () => {
    const splitData = {
      ...billData,
      items: items,
      people: people,
      splits: people.map((person) => ({
        ...person,
        amount: calculatePersonTotal(person.email),
        items: items.filter((item) => item.assignedTo.includes(person.email)),
      })),
    }
    localStorage.setItem("splitData", JSON.stringify(splitData))
    // Clear the split page state since we're moving to summary
    localStorage.removeItem("splitPageState")
    router.push("/summary")
  }

  const removePerson = (emailToRemove) => {
    // Remove person from people list
    const newPeople = people.filter((person) => person.email !== emailToRemove)
    setPeople(newPeople)

    // Remove person from all item assignments
    const newItems = items.map((item) => ({
      ...item,
      assignedTo: item.assignedTo.filter((email) => email !== emailToRemove),
    }))
    setItems(newItems)
  }

  useEffect(() => {
    if (!billData) return // Add this guard clause

    const assigned = people.reduce((sum, person) => sum + calculatePersonTotal(person.email), 0)
    setAssignedTotal(assigned)
    const totalAmount = billData?.nett_amount || 0
    setCanFinalize(Math.abs(totalAmount - assigned) < 0.01) // Allow small rounding differences
  }, [items, people, billData, calculatePersonTotal])

  const refreshDataFromStorage = useCallback(() => {
    console.log("Refreshing data from storage...")

    // Get the most recent receipt data
    const receiptData = localStorage.getItem("receiptData")
    const billData = localStorage.getItem("billData")

    let dataToUse = null

    if (receiptData) {
      try {
        const parsed = JSON.parse(receiptData)
        const structured = JSON.parse(parsed.structured_data)
        dataToUse = structured
        console.log("Refreshed with receipt data")
      } catch (error) {
        console.error("Error parsing receipt data:", error)
      }
    }

    if (!dataToUse && billData) {
      try {
        dataToUse = JSON.parse(billData)
        console.log("Refreshed with bill data")
      } catch (error) {
        console.error("Error parsing bill data:", error)
      }
    }

    if (dataToUse && JSON.stringify(dataToUse) !== JSON.stringify(billData)) {
      console.log("Data has changed, updating...")
      setBillData(dataToUse)

      // Update items with new data while preserving assignments
      const newItems =
        dataToUse.items?.map((newItem) => {
          const existingItem = items.find((item) => item.id === newItem.id)
          return {
            ...newItem,
            assignedTo: existingItem?.assignedTo || [],
          }
        }) || []

      setItems(newItems)

      toast.success({
        title: "Data updated!",
        description: "Using the latest edited receipt data.",
      })
    }
  }, [items])

  // Add this useEffect to refresh data when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isInitialized) {
        refreshDataFromStorage()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refreshDataFromStorage, isInitialized])

  if (!billData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-purple-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-semibold text-gray-900">Split Bill</h1>
          <Button
            onClick={handleFinalize}
            size="sm"
            disabled={!canFinalize}
            className={`${
              canFinalize
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4 mr-1" />
            {canFinalize ? "Finalize" : "Balance Required"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* LLM Chat Placeholder */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Smart Split Assistant</h3>
                <p className="text-sm text-gray-600">Ask me to help split items automatically</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled className="text-purple-600 border-purple-200 opacity-50">
              Coming Soon
            </Button>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Items Section */}
          <div className="space-y-4">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="font-semibold text-gray-900 mb-4">Items to Split</h2>
              {/* Replace the DragDropContext implementation with simple touch interactions */}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-purple-600">${item.nett_price.toFixed(2)}</p>
                    </div>

                    {/* Assigned people */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.assignedTo.map((email) => {
                        const person = people.find((p) => p.email === email)
                        return person ? (
                          <Badge key={email} className={`text-xs ${person.color}`}>
                            {person.nickname}
                          </Badge>
                        ) : null
                      })}
                    </div>

                    {/* Assignment buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {people.map((person) => (
                        <Button
                          key={person.email}
                          variant={item.assignedTo.includes(person.email) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleItemAssignment(item.id, person.email)}
                          className={`text-xs ${
                            item.assignedTo.includes(person.email)
                              ? "bg-purple-600 hover:bg-purple-700"
                              : "border-purple-200 text-purple-700 hover:bg-purple-50"
                          }`}
                        >
                          {item.assignedTo.includes(person.email) ? "✓ " : "+ "}
                          {person.nickname}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* People Section */}
          <div className="space-y-4">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">People ({people.length})</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddPerson(true)}
                  className="text-purple-600 border-purple-200"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Quick Add from Suggestions */}
              {!showAddPerson && suggestedEmails.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-900">Previously Added</p>
                    <ChevronDown className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedEmails
                      .filter((email) => !people.find((p) => p.email === email))
                      .slice(0, 3)
                      .map((email) => (
                        <Button
                          key={email}
                          variant="outline"
                          size="sm"
                          onClick={() => addSuggestedPerson(email)}
                          className="text-xs bg-white hover:bg-blue-100 border-blue-200 text-blue-700"
                        >
                          + {email}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {showAddPerson && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                  <div className="relative">
                    <Input
                      placeholder="Enter email address"
                      value={newPersonEmail}
                      onChange={(e) => {
                        setNewPersonEmail(e.target.value)
                        setShowSuggestions(true)
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => {
                        // Delay hiding suggestions to allow clicks
                        setTimeout(() => setShowSuggestions(false), 200)
                      }}
                      className="mb-2"
                    />

                    {/* Email Suggestions Dropdown */}
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                        {filteredSuggestions.map((email) => (
                          <button
                            key={email}
                            onClick={() => {
                              setNewPersonEmail(email)
                              setShowSuggestions(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-purple-50 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <span>{email}</span>
                              <span className="text-xs text-gray-500">Previously added</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={addPerson} className="bg-purple-600 hover:bg-purple-700">
                      Add Person
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddPerson(false)
                        setShowSuggestions(false)
                        setNewPersonEmail("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {people.map((person) => {
                  const total = calculatePersonTotal(person.email)
                  const assignedItems = items.filter((item) => item.assignedTo.includes(person.email))

                  return (
                    <div
                      key={person.email}
                      className={`p-4 rounded-lg border-2 ${person.color} transition-all duration-200`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex-1">
                          {editingNickname === person.email ? (
                            <div className="space-y-2">
                              <Input
                                value={tempNickname}
                                onChange={(e) => setTempNickname(e.target.value)}
                                className="text-sm"
                                placeholder="Enter nickname"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateNickname(person.email, tempNickname)}
                                  className="text-xs bg-purple-600 hover:bg-purple-700"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingNickname(null)}
                                  className="text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium">{person.nickname}</p>
                                <p className="text-xs opacity-75">{person.email}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingNickname(person.email, person.nickname)}
                                className="text-xs opacity-60 hover:opacity-100"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">${total.toFixed(2)}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePerson(person.email)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {assignedItems.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">Items ({assignedItems.length}):</p>
                          <div className="space-y-1">
                            {assignedItems.map((item) => (
                              <div key={item.id} className="flex justify-between text-xs opacity-75">
                                <span>{item.name}</span>
                                <span>${(item.nett_price / item.assignedTo.length).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Bill Summary */}
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Bill Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold">${(billData?.nett_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Assigned</span>
                  <span className="font-semibold text-green-600">
                    ${people.reduce((sum, person) => sum + calculatePersonTotal(person.email), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining</span>
                  <span
                    className={`font-semibold ${
                      Math.abs((billData?.nett_amount || 0) - assignedTotal) < 0.01
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    ${((billData?.nett_amount || 0) - assignedTotal).toFixed(2)}
                  </span>
                </div>
              </div>
              {!canFinalize && (
                <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-700">
                  ⚠️ All items must be assigned before finalizing
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
