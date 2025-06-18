"use client"

import { useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          {/* Logo */}
          <div className="mx-auto h-16 w-16 bg-black rounded-2xl flex items-center justify-center mb-8">
            <div className="text-white text-2xl font-bold">S</div>
          </div>

          <h1 className="text-center text-3xl font-semibold tracking-tight text-gray-900 mb-2">Welcome to SplitEasy</h1>
          <p className="text-center text-gray-600 mb-8">Split bills effortlessly with friends</p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <Button
            onClick={signInWithGoogle}
            className="w-full h-12 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-colors duration-200"
          >
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-12">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-gray-600 rounded-sm"></div>
            </div>
            <span className="text-gray-700 font-medium">AI-powered receipt scanning</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-gray-600 rounded-sm"></div>
            </div>
            <span className="text-gray-700 font-medium">Smart bill splitting</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-gray-600 rounded-sm"></div>
            </div>
            <span className="text-gray-700 font-medium">Easy friend management</span>
          </div>
        </div>
      </div>
    </div>
  )
}
