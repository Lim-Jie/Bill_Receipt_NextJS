"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { useAuth } from "../auth/auth-provider"
import { motion, AnimatePresence } from "framer-motion"
import { X, Chrome, Sparkles, Receipt, Users, PieChart } from "lucide-react"
import { useState } from "react"

export default function LoginCard ({ isOpen, onClose }) {

    const { user, loading, signInWithGoogle } = useAuth();
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsSigningIn(true);
        try {
            await signInWithGoogle();
            onClose(); // Close the modal after successful login
        } catch (error) {
            console.error('Error signing in:', error);
        } finally {
            setIsSigningIn(false);
        }
    };

    if (loading) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    >
                        <div className="bg-white rounded-xl p-8 text-center">
                            <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Don't show if user is already logged in
    if (user) {
        return null;
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={onClose} // Close when clicking backdrop
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                        className="w-full max-w-md"
                    >
                        <Card className="relative w-full bg-white shadow-2xl">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
                            >
                                <X className="w-4 h-4 text-gray-600" />
                            </button>

                            <CardHeader className="text-center pb-4">
                                {/* <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center">
                                        <Receipt className="w-8 h-8 text-white" />
                                    </div>
                                </div> */}
                                <CardTitle className="text-2xl text-gray-900 mr-auto">
                                JomSplit
                                </CardTitle>
                                <CardDescription className="text-gray-600 text-base text-left mt-2">
                                    Split bills effortlessly with friends and track your expenses
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Features List */}
                                {/* <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Receipt className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">Scan and store your receipts</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Users className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">Add friends and split bills easily</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                            <PieChart className="w-4 h-4 text-green-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">Track expenses with visual charts</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">AI-powered receipt analysis</span>
                                    </div>
                                </div> */}

                                {/* Sign In Button */}
                                <div className="">
                                    <Button
                                        onClick={handleGoogleSignIn}
                                        disabled={isSigningIn}
                                        className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-3"
                                    >
                                        {isSigningIn ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
                                                <span>Signing in...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Chrome className="w-5 h-5" />
                                                <span>Continue with Google</span>
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Terms */}
                                <p className="text-xs text-gray-500 text-center leading-relaxed">
                                    By continuing, you agree to our Terms of Service and Privacy Policy. 
                                    Your data is secure and never shared with third parties.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}