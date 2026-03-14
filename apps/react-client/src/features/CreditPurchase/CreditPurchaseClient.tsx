
import { useState, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { CreditPackageResponseDto } from "@/types/wallet.types";
import walletService from "@/services/wallet.api";
import { checkTransactionByHash, startPayment } from "@/services/payment-flow.api";
import Khqr from "./khqr";

const CUSTOM_PRICE_RATE = 0.00157302;
const PAYMENT_CHECK_INTERVAL = 3000;
const PAYMENT_TIMEOUT = 300000;
const SUCCESS_DISPLAY_TIME = 3000;

interface QRReadyPayload {
    qr: string;
}

interface PaymentStatusPayload {
    status: string;
}

export default function CreditPurchaseClient() {
    // --- Package & Token States ---
    const [currentTokens, setCurrentTokens] = useState<number>(0);
    const [packages, setPackages] = useState<CreditPackageResponseDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedPackId, setSelectedPackId] = useState<string>("custom");
    const [customTokenAmount, setCustomTokenAmount] = useState<number>(890000);
    const [paymentMethod, setPaymentMethod] = useState<"ABA" | "KHQR">("ABA");
    const [termsAgreed, setTermsAgreed] = useState(false);

    // --- Payment Modal States ---
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentData, setPaymentData] = useState<{ paymentId: number; message: string } | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [paymentTimeout, setPaymentTimeout] = useState(false);
    // const [showTimeoutTransition, setShowTimeoutTransition] = useState(false);

    // --- Refs ---
    const checkStatusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const checkStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const userId = useRef<number | null>(null);

    // --- Initialize WebSocket ---
    useEffect(() => {
        const token = localStorage.getItem("jwtToken");
        const userIdFromStorage = localStorage.getItem("userId");

        if (userIdFromStorage) {
            userId.current = parseInt(userIdFromStorage);

            const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000' , {
                query: { userId: userIdFromStorage },
                transports: ["websocket"],
                auth: {
                    token: token ?? "",
                },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
            });

            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("✅ Socket connected");
            });

            socket.on("disconnect", () => {
                console.log("❌ Socket disconnected - will use polling fallback");
            });

            socket.on("connect_error", (err) => {
                console.error("❌ Connection error:", err.message);
            });

            // Listen for QR code from WebSocket
            socket.on("QR_READY", (payload: QRReadyPayload) => {
                console.log("✅ QR Ready from WebSocket");
                setPaymentData({
                    paymentId: 0,
                    message: payload.qr,
                });
                setIsProcessingPayment(false);
                startPaymentStatusCheck();
            });

            // Listen for payment status from WebSocket (instant notification)
            socket.on("PAYMENT_STATUS", (payload: PaymentStatusPayload) => {
                console.log("📦 Payment Status:", payload.status);
                if (payload.status === "PAID" || payload.status === "SUCCESS") {
                    handlePaymentSuccess();
                }
            });

            return () => {
                if (socket.connected) socket.disconnect();
            };
        }
    }, []);

    // --- Load Packages & Balance ---
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const [balanceData, packagesData] = await Promise.all([
                    walletService.getWalletBalance(),
                    walletService.getCreditPackages()
                ]);

                const extractedBalance =
                    (balanceData as any)?.balance ??
                    (balanceData as any)?.creditBalance ??
                    (balanceData as any)?.data?.balance ??
                    (balanceData as any)?.data?.creditBalance ?? 0;

                setCurrentTokens(extractedBalance);

                let rawPackages: any[] = [];
                if (Array.isArray(packagesData)) {
                    rawPackages = packagesData;
                } else if (packagesData && typeof packagesData === "object") {
                    rawPackages = (packagesData as any).data || (packagesData as any).items || [];
                }

                const activePackages = rawPackages.filter(pkg => pkg.isActive !== false);
                setPackages(activePackages);

                if (activePackages.length > 0) {
                    setSelectedPackId(activePackages[0].id.toString());
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load wallet data.");
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    // --- Cleanup on unmount ---
    useEffect(() => {
        return () => {
            if (checkStatusIntervalRef.current) clearInterval(checkStatusIntervalRef.current);
            if (checkStatusTimeoutRef.current) clearTimeout(checkStatusTimeoutRef.current);
        };
    }, []);

    // --- Summary Calculations ---
    const customPrice = Number((customTokenAmount * CUSTOM_PRICE_RATE).toFixed(2));

    let summaryName = "";
    let summaryTokens = 0;
    let summaryPrice = 0;

    if (selectedPackId === "custom") {
        summaryName = "Custom Token Pack";
        summaryTokens = customTokenAmount;
        summaryPrice = customPrice;
    } else {
        const pack = packages.find((p) => p.id.toString() === selectedPackId);
        if (pack) {
            summaryName = pack.name;
            summaryTokens = (pack as any).credits || (pack as any).tokens || 0;
            summaryPrice = pack.price;
        }
    }

    // --- Handle Payment Success ---
    const handlePaymentSuccess = () => {
        setPaymentSuccess(true);
        setIsCheckingStatus(false);

        if (checkStatusIntervalRef.current) {
            clearInterval(checkStatusIntervalRef.current);
        }
        if (checkStatusTimeoutRef.current) {
            clearTimeout(checkStatusTimeoutRef.current);
        }

        setTimeout(() => {
            setIsPaymentModalOpen(false);
            setPaymentSuccess(false);
            setPaymentData(null);
            setPaymentTimeout(false);
            // setShowTimeoutTransition(false);
            // Optionally refresh balance here
            loadBalance();
        }, SUCCESS_DISPLAY_TIME);
    };

    // --- Load Balance ---
    const loadBalance = async () => {
        try {
            const balanceData = await walletService.getWalletBalance();
            const extractedBalance =
                (balanceData as any)?.balance ??
                (balanceData as any)?.creditBalance ??
                (balanceData as any)?.data?.balance ??
                (balanceData as any)?.data?.creditBalance ?? 0;
            setCurrentTokens(extractedBalance);
        } catch (err) {
            console.error("Failed to refresh balance:", err);
        }
    };

    // --- Auto-check payment status (Polling Fallback) ---
    const startPaymentStatusCheck = () => {
        setIsCheckingStatus(true);
        setPaymentError(null);
        setPaymentTimeout(false);
        // setShowTimeoutTransition(false);

        checkStatusTimeoutRef.current = setTimeout(() => {
            if (checkStatusIntervalRef.current) {
                clearInterval(checkStatusIntervalRef.current);
            }
            setIsCheckingStatus(false);
            setPaymentTimeout(true);
            // setShowTimeoutTransition(true);
        }, PAYMENT_TIMEOUT);

        const checkNow = async () => {
            if (!paymentData?.message) return;

            try {
                const res = await checkTransactionByHash({
                    hash: paymentData.message,
                    amount: summaryPrice,
                    currency: "USD" as any
                });

                const responseData = (res as any).data || res;

                if (responseData?.responseCode === 0) {
                    handlePaymentSuccess();
                }
            } catch (err) {
                console.error("Payment check error:", err);
            }
        };

        checkNow();
        checkStatusIntervalRef.current = setInterval(checkNow, PAYMENT_CHECK_INTERVAL);
    };

    // --- Start Payment ---
    const handleProcessPayment = async () => {
        if (paymentMethod === "KHQR") {
            if (selectedPackId === "custom") {
                setError("Custom packages are currently not supported via Bakong directly. Please select a standard package.");
                return;
            }

            setIsPaymentModalOpen(true);
            setIsProcessingPayment(true);
            setPaymentError(null);
            setPaymentTimeout(false);
            // setShowTimeoutTransition(false);

            try {
                const response = await startPayment(Number(selectedPackId));
                const data = (response as any).data || response;
                setPaymentData(data);

                setTimeout(() => {
                    setIsProcessingPayment(false);
                    startPaymentStatusCheck();
                }, 500);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to initiate payment.");
                setIsProcessingPayment(false);
                setIsPaymentModalOpen(false);
            }
        } else {
            alert("Processing ABA Payment...");
        }
    };

    // --- Manual check payment ---
    const handleManualCheckPaymentStatus = async () => {
        if (!paymentData?.message) return;

        try {
            const res = await checkTransactionByHash({
                hash: paymentData.message,
                amount: summaryPrice,
                currency: "USD" as any
            });

            const responseData = (res as any).data || res;
            if (responseData?.responseCode === 0) {
                handlePaymentSuccess();
            } else {
                setPaymentError("Payment not yet received or pending.");
            }
        } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Failed to check status.");
        }
    };

    // --- Retry Payment ---
    const handleRetryPayment = () => {
        setPaymentTimeout(false);
        // setShowTimeoutTransition(false);
        setPaymentError(null);
        setPaymentData(null);
        setIsProcessingPayment(true);

        // Reinitiate payment
        handleProcessPayment();
    };

    // --- Close Modal ---
    const handleCloseModal = () => {
        setIsPaymentModalOpen(false);
        if (checkStatusIntervalRef.current) clearInterval(checkStatusIntervalRef.current);
        if (checkStatusTimeoutRef.current) clearTimeout(checkStatusTimeoutRef.current);
        setIsCheckingStatus(false);
        setPaymentData(null);
        setPaymentTimeout(false);
        // setShowTimeoutTransition(false);
        setPaymentSuccess(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center flex-1 min-h-[50vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-transparent mb-4 mx-auto"></div>
                    <p className="text-slate-500">Loading token packages...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="px-6 py-6 max-w-5xl mx-auto w-full flex flex-col gap-10">

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* --- STATUS SECTION --- */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Token Balance</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Current Balance</h3>
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                        Available Tokens:{" "}
                        <span className="font-bold text-slate-900 text-base">
                            {currentTokens.toLocaleString()}
                        </span>
                    </p>
                </div>
            </section>

            {/* --- PACKAGES SECTION --- */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Token Packages</h2>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                    {packages.map((pack) => {
                        const isSelected = selectedPackId === pack.id.toString();
                        return (
                            <article
                                key={pack.id}
                                onClick={() => setSelectedPackId(pack.id.toString())}
                                className={`bg-white rounded-xl border shadow-sm transition-all duration-200 flex flex-col h-[280px] p-6 cursor-pointer ${isSelected
                                    ? "border-slate-900 ring-1 ring-slate-900"
                                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                                    }`}
                            >
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-2">{pack.name}</h3>
                                    <p className="text-2xl font-normal text-slate-800 mb-1">
                                        {((pack as any).credits || (pack as any).tokens || 0).toLocaleString()} Tokens
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {(pack as any).description || "Best value package"}
                                    </p>
                                </div>
                                <div className="mt-auto flex items-center justify-between">
                                    <span className="text-2xl font-normal text-slate-800">${pack.price}</span>
                                    <button
                                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                    >
                                        {isSelected ? "Selected" : "Select"}
                                    </button>
                                </div>
                            </article>
                        );
                    })}

                    {/* Custom Pack */}
                    <article
                        onClick={() => setSelectedPackId("custom")}
                        className={`bg-white rounded-xl border shadow-sm transition-all duration-200 flex flex-col h-[280px] p-6 cursor-pointer ${selectedPackId === "custom"
                            ? "border-slate-900 ring-1 ring-slate-900"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                            }`}
                    >
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-900 mb-2">Custom Token Pack</h3>
                            <p className="text-xs text-slate-400 mb-4">Tailor to your exact needs</p>
                            <label className="text-xs text-slate-500 mb-1 block">Enter Token Amount:</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={customTokenAmount || ""}
                                    onChange={(e) => {
                                        setCustomTokenAmount(Number(e.target.value));
                                        setSelectedPackId("custom");
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400">Tokens</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                Price:{" "}
                                <span className="font-medium text-slate-900">
                                    ${customPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </p>
                        </div>
                        <div className="mt-auto flex items-end justify-end">
                            <button
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPackId === "custom" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    }`}
                            >
                                {selectedPackId === "custom" ? "Selected" : "Select"}
                            </button>
                        </div>
                    </article>
                </div>
            </section>

            {/* --- PAYMENT SECTION --- */}
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Payment Details</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Summary */}
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-4 text-slate-900">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="font-semibold text-sm">Order Summary</h3>
                        </div>
                        <div className="space-y-3 pl-7 text-sm">
                            <p className="text-slate-500">
                                Package: <span className="text-slate-900 ml-1">{summaryName}</span>
                            </p>
                            <p className="text-slate-500">
                                Tokens: <span className="text-slate-900 ml-1">{summaryTokens.toLocaleString()}</span>
                            </p>
                            <p className="text-slate-900 font-bold pt-2">
                                Total: <span className="text-lg ml-2">${summaryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </p>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-4 text-slate-900">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="font-semibold text-sm">Payment Method</h3>
                        </div>
                        <div className="space-y-2 pl-7">
                            {/* KHQR */}
                            <label className="flex items-center gap-4 cursor-pointer p-3 rounded-lg hover:bg-slate-50 border border-transparent transition-colors">
                                <input
                                    type="radio"
                                    name="payment"
                                    checked={paymentMethod === "KHQR"}
                                    onChange={() => setPaymentMethod("KHQR")}
                                    className="hidden"
                                />
                                <div className={`w-12 h-12 bg-[#E5223A] rounded-lg flex items-center justify-center transition-all ${paymentMethod === 'KHQR' ? 'ring-2 ring-offset-2 ring-[#E5223A]' : ''}`}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-slate-900">Bakong KHQR</p>
                                    <p className="text-xs text-slate-500">Instant payment via KHQR QR code</p>
                                </div>
                            </label>

                            <hr className="border-slate-100 ml-14" />

                            {/* ABA */}
                            <label className="flex items-center gap-4 cursor-pointer p-3 rounded-lg hover:bg-slate-50 border border-transparent transition-colors opacity-50">
                                <input
                                    type="radio"
                                    name="payment"
                                    checked={paymentMethod === "ABA"}
                                    onChange={() => setPaymentMethod("ABA")}
                                    disabled
                                    className="hidden"
                                />
                                <div className={`w-12 h-12 bg-[#00539A] rounded-lg flex items-center justify-center text-white font-bold text-sm transition-all`}>
                                    ABA
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-slate-900">ABA</p>
                                    <p className="text-xs text-slate-500">Coming soon</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="p-6 bg-slate-50/50">
                        <label className="flex items-center gap-3 cursor-pointer group w-max">
                            <input
                                type="checkbox"
                                checked={termsAgreed}
                                onChange={(e) => setTermsAgreed(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 transition-colors cursor-pointer"
                            />
                            <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                                I agree to the Terms & Conditions
                            </span>
                        </label>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleProcessPayment}
                        disabled={!termsAgreed || packages.length === 0 || paymentMethod !== "KHQR"}
                        className={`px-8 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${termsAgreed && paymentMethod === "KHQR"
                            ? "bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            }`}
                    >
                        Proceed to Payment
                    </button>
                </div>
            </section>

            {/* --- PAYMENT MODAL --- */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

                        {/* Header */}
                        <div className="bg-[#E5223A] px-6 py-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="font-bold tracking-wide">KHQR Payment</span>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col items-center text-center">

                            {isProcessingPayment ? (
                                // Loading
                                <div className="py-12 flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#E5223A] border-t-transparent mb-4"></div>
                                    <p className="text-slate-500 text-sm">Generating QR Code...</p>
                                </div>
                            ) : paymentSuccess ? (
                                // Success
                                <div className="py-12 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-pulse">
                                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-lg font-semibold text-green-600 mb-2">Payment Successful!</p>
                                    <p className="text-sm text-slate-500">Your tokens have been added to your account</p>
                                </div>
                            ) : paymentTimeout ? (
                                // Timeout
                                <div className="py-12 flex flex-col items-center transition-all duration-500 animate-in fade-in">
                                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-lg font-semibold text-orange-600 mb-2">Payment Timeout</p>
                                    <p className="text-sm text-slate-500 mb-6">The QR code has expired. Please try again or contact support.</p>

                                    <div className="w-full flex gap-3">
                                        <button
                                            onClick={handleCloseModal}
                                            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleRetryPayment}
                                            className="flex-1 py-2.5 rounded-lg bg-[#E5223A] text-white font-medium text-sm hover:bg-[#d41c33] shadow-sm transition-colors"
                                        >
                                            Retry Payment
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // QR Display
                                <>
                                    {paymentData && (
                                        <div className="w-full mb-6">
                                            <Khqr
                                                name={summaryName}
                                                amount={summaryPrice}
                                                qrValue={paymentData.message}
                                            />
                                        </div>
                                    )}

                                    {/* Status Info */}
                                    <div className="w-full mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-300">
                                        {isCheckingStatus ? (
                                            <div className="flex items-center gap-2 text-sm text-blue-700">
                                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                                                <span>Checking payment status...</span>
                                            </div>
                                        ) : paymentError ? (
                                            <p className="text-sm text-red-700">{paymentError}</p>
                                        ) : (
                                            <p className="text-sm text-blue-700">Scan the QR code with your banking app to complete payment</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="w-full flex gap-3">
                                        <button
                                            onClick={handleCloseModal}
                                            disabled={isCheckingStatus}
                                            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleManualCheckPaymentStatus}
                                            disabled={isCheckingStatus}
                                            className="flex-1 py-2.5 rounded-lg bg-[#E5223A] text-white font-medium text-sm hover:bg-[#d41c33] disabled:opacity-50 shadow-sm transition-colors"
                                        >
                                            {isCheckingStatus ? "Checking..." : "Check Status"}
                                        </button>
                                    </div>

                                    <p className="text-xs text-slate-400 mt-4">
                                        ✅ Auto-checking every 3 seconds • Expires in 5 minutes
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}