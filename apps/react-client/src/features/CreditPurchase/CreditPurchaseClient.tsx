
import { useState, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { CreditPackageResponseDto } from "@/types/wallet.types";
import walletService from "@/services/wallet.api";
import { startPayment } from "@/services/payment-flow.api";
import { useAuth } from "@/context/AuthContext";
import Khqr from "./khqr";

const CUSTOM_PRICE_RATE = 0.00157302;
const PAYMENT_TIMEOUT = 300000;
const SUCCESS_DISPLAY_TIME = 3000;

interface QRReadyPayload {
    qr: string;
}

interface PaymentStatusPayload {
    status: string;
}

export default function CreditPurchaseClient() {
    // --- Auth Context ---
    const { user } = useAuth();

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
    const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ✅ Connect WebSocket on mount
    useEffect(() => {
        if (!user?.id) {
            console.log("⚠️  Waiting for user ID...");
            return;
        }

        console.log("🔌 Initiating WebSocket connection...");
        console.log("📍 Frontend running on:", window.location.origin);
        console.log("🎯 Backend URL:", import.meta.env.VITE_API_URL || 'http://localhost:3000');
        console.log("👤 User ID:", user.id);

        // ✅ Only create one socket - match PaymentComponent pattern
        const newSocket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            query: { userId: user.id },
            transports: ["websocket"],
        });

        newSocket.on("connect", () => {
            console.log("✅ Socket connected successfully");
            console.log("📡 Socket ID:", newSocket.id);
        });

        newSocket.on("disconnect", () => {
            console.log("❌ Socket disconnected");
        });

        newSocket.on("connect_error", (err) => {
            console.error("❌ Connection error:", err.message);
            console.error("🔍 Full error:", err);
        });

        // Listen for QR code from WebSocket
        newSocket.on("QR_READY", (payload: QRReadyPayload) => {
            console.log("✅ QR Ready from WebSocket - Raw payload:", payload);
            console.log("📊 QR Payload analysis:", {
                hasQr: !!payload.qr,
                qrType: typeof payload.qr,
                qrLength: typeof payload.qr === 'string' ? payload.qr.length : 'N/A',
                isValidQR: typeof payload.qr === 'string' && payload.qr.length > 10,
            });

            // ✅ Validate: Must be a non-empty string
            if (!payload.qr || typeof payload.qr !== 'string') {
                console.error("❌ Invalid QR: Not a string", { received: payload.qr, type: typeof payload.qr });
                setPaymentError("QR code generation failed - invalid format");
                setIsProcessingPayment(false);
                return;
            }

            // ✅ Validate: Must look like a QR string (KHQR starts with "0002" or is long enough)
            if (payload.qr.length < 20 || (!payload.qr.startsWith("0002") && payload.qr.length < 50)) {
                console.error("❌ Invalid QR format: String too short or wrong prefix", {
                    length: payload.qr.length,
                    startsWith: payload.qr.substring(0, 10)
                });
                setPaymentError("Invalid QR code format from server");
                setIsProcessingPayment(false);
                return;
            }

            console.log("✅ QR value is valid KHQR string, storing in paymentData...");
            console.log("📌 QR string preview:", payload.qr.substring(0, 50) + "...");

            // ✅ Only set paymentData when we have a valid QR from WebSocket
            setPaymentData({
                paymentId: 0,
                message: payload.qr,
            });
            setIsProcessingPayment(false);
        });

        // Listen for payment status from WebSocket
        newSocket.on("PAYMENT_STATUS", (payload: PaymentStatusPayload) => {
            console.log("📦 Payment Status:", payload.status);
            if (payload.status === "PAID" || payload.status === "SUCCESS") {
                handlePaymentSuccess();
            }
        });

        // 🔒 Cleanup on unmount
        return () => {
            console.log("🧹 Cleaning up WebSocket connection");
            if (newSocket.connected) {
                newSocket.disconnect();
            }
        };
    }, [user?.id]); // ✅ Reconnect if user ID changes

    // ✅ Setup payment timeout when QR code arrives (WebSocket will send PAYMENT_STATUS event)
    useEffect(() => {
        if (paymentData?.message && isPaymentModalOpen) {
            console.log("🎯 Valid QR code received from WebSocket, waiting for PAYMENT_STATUS event...");
            setupPaymentTimeout();
        }
    }, [paymentData?.message, isPaymentModalOpen]);

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
            if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
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
        console.log("✅ Payment success - WebSocket PAYMENT_STATUS event received");
        setPaymentSuccess(true);
        setIsCheckingStatus(false);

        if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
        }

        setTimeout(() => {
            setIsPaymentModalOpen(false);
            setPaymentSuccess(false);
            setPaymentData(null);
            setPaymentTimeout(false);
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

    // --- Setup payment timeout (WebSocket only) ---
    const setupPaymentTimeout = () => {
        console.log("⏱️  Setting up payment timeout (5 minutes)...");
        setIsCheckingStatus(true);
        setPaymentError(null);
        setPaymentTimeout(false);

        // Clear any existing timeout
        if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
        }

        // Set timeout: if WebSocket doesn't emit PAYMENT_STATUS within 5 minutes, show error
        paymentTimeoutRef.current = setTimeout(() => {
            console.log("❌ Payment timeout: No PAYMENT_STATUS received from WebSocket");
            setIsCheckingStatus(false);
            setPaymentTimeout(true);
        }, PAYMENT_TIMEOUT);
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
            setPaymentData(null); // ✅ Clear old data, wait for WebSocket QR_READY
            // setShowTimeoutTransition(false);

            try {
                const response = await startPayment(Number(selectedPackId));
                // ✅ Don't set paymentData here - wait for WebSocket QR_READY event
                // The backend will emit QR_READY with actual QR code
                console.log("📤 Payment initiated, waiting for QR from WebSocket...", response);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to initiate payment.");
                setIsProcessingPayment(false);
                setIsPaymentModalOpen(false);
            }
        } else {
            alert("Processing ABA Payment...");
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
        if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
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
                    <div className="w-8 h-8 mx-auto mb-4 border-4 rounded-full animate-spin border-slate-900 border-t-transparent"></div>
                    <p className="text-slate-500">Loading token packages...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-8 mx-auto max-w-7xl">

                {/* HEADER */}
                <div className="flex items-center justify-between gap-6 p-4 mb-6 bg-white rounded-lg">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">AI Token Center</h1>
                        <p className="text-slate-500 text-xs mt-0.5">Top up your account for academic evaluations.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Your Balance</p>
                        <p className="text-2xl font-bold text-blue-600">{currentTokens.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">Tokens</p>
                    </div>
                </div>

                {error && (
                    <div className="flex gap-3 p-4 mb-8 text-sm text-red-700 border border-red-200 bg-red-50 rounded-xl">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* TWO COLUMN LAYOUT */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

                    {/* LEFT COLUMN - PACKAGES (2 cols) */}
                    <div className="lg:col-span-2">
                        <h2 className="flex items-center gap-2 mb-6 text-xs font-bold tracking-widest uppercase text-slate-900">
                            <span className="text-lg text-blue-600">|</span> SELECT A PACKAGE
                        </h2>

                        {/* Package Grid - 3 columns */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {packages.map((pack) => {
                                const isSelected = selectedPackId === pack.id.toString();
                                const isPopular = pack.name?.toLowerCase().includes("student");
                                const tokens = ((pack as any).credits || (pack as any).tokens || 0);
                                return (
                                    <div
                                        key={pack.id}
                                        onClick={() => setSelectedPackId(pack.id.toString())}
                                        className={`rounded-xl border-2 p-5 cursor-pointer transition-all relative ${isSelected
                                            ? "border-blue-600 bg-blue-50"
                                            : "border-slate-200 bg-white hover:shadow-sm"
                                            }`}
                                    >
                                        {/* POPULAR Badge */}
                                        {isPopular && (
                                            <div className="absolute px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded-full shadow-md -top-3 right-4">
                                                POPULAR
                                            </div>
                                        )}

                                        <div className="text-left">
                                            <p className="mb-2 text-xs font-semibold tracking-wider uppercase text-slate-500">{pack.name}</p>
                                            <p className="mb-1 text-3xl font-bold text-slate-900">
                                                {tokens.toLocaleString()}
                                            </p>
                                            <p className="mb-4 text-xs text-slate-600">Tokens</p>

                                            <div className="flex items-center justify-between">
                                                <p className="text-xl font-bold text-blue-600">${pack.price.toFixed(2)}</p>

                                                {/* Checkmark circle or Select text */}
                                                {isSelected ? (
                                                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full">
                                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-semibold text-slate-400">Select</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CUSTOM TOKEN CALCULATOR */}
                        <div className="p-6 bg-white border rounded-2xl border-slate-200">
                            {/* TOP ROW - Title & Input & Button */}
                            <div className="flex items-start justify-between gap-6 mb-6">
                                {/* LEFT - Title & Description */}
                                <div className="flex-shrink-0 min-w-fit">
                                    <h3 className="mb-1 text-base font-bold text-slate-900">Custom<br />Token<br />Calculator</h3>
                                    <p className="text-xs leading-relaxed text-slate-500">Perfect for specific grading cycles or large batches.</p>
                                </div>

                                {/* CENTER - Input & Button */}
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={customTokenAmount || ""}
                                            onChange={(e) => {
                                                setCustomTokenAmount(Number(e.target.value));
                                                setSelectedPackId("custom");
                                            }}
                                            placeholder="Enter amount"
                                            className="px-4 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-56 pr-20 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&]:appearance-none"
                                        />
                                        <span className="absolute text-xs font-semibold -translate-y-1/2 pointer-events-none right-4 top-1/2 text-slate-400">TOKENS</span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedPackId("custom")}
                                        className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
                                    >
                                        Calculate
                                    </button>
                                </div>
                            </div>

                            {/* BOTTOM ROW - Info & Estimated */}
                            <div className="flex items-center justify-between gap-6 pt-4 border-t border-slate-200">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <svg className="flex-shrink-0 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Prices are inclusive of all local taxes.</span>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-xs font-semibold text-slate-500">Estimated:</p>
                                    <p className="text-2xl font-bold text-blue-600">${customPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - ORDER SUMMARY SIDEBAR */}
                    <div className="lg:col-span-1">
                        <div className="sticky p-6 bg-white border top-8 rounded-2xl border-slate-200">

                            {/* HEADER */}
                            <h3 className="mb-6 text-lg font-bold text-slate-900">Order Summary</h3>

                            {/* PACKAGE INFO */}
                            <div className="pb-6 mb-6 border-b border-slate-200">
                                <p className="mb-1 text-sm text-slate-600">{summaryName}</p>
                                <p className="mb-2 text-sm font-semibold text-slate-900">{summaryTokens.toLocaleString()} AI Evaluation Tokens</p>
                            </div>

                            {/* PRICING BREAKDOWN */}
                            <div className="pb-6 mb-6 space-y-3 text-sm border-b border-slate-200">
                                <div className="flex justify-between text-slate-600">
                                    <span>Service Fee</span>
                                    <span>$0.00</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>VAT (Inclusive)</span>
                                    <span>$0.00</span>
                                </div>
                                <div className="flex justify-between pt-2 text-lg font-bold text-slate-900">
                                    <span>Total Price</span>
                                    <span className="text-blue-600">${summaryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* PAYMENT METHOD */}
                            <div className="mb-6">
                                <p className="mb-3 text-xs font-bold tracking-wider uppercase text-slate-500">Payment Method</p>
                                <div className="flex gap-3">
                                    {/* KHQR */}
                                    <button
                                        onClick={() => setPaymentMethod("KHQR")}
                                        className={`flex-1 p-4 rounded-lg border-2 transition flex items-center justify-start gap-3 ${paymentMethod === "KHQR"
                                            ? "border-blue-600 bg-blue-50"
                                            : "border-slate-200 bg-white hover:border-slate-300"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <img src="/assets/KHQR.png" alt="KHQR" className="w-8 h-8 rounded" />
                                            <span className="text-xs font-bold text-blue-600">KHQR</span>
                                        </div>
                                    </button>

                                    {/* ABA */}
                                    <button
                                        disabled
                                        className="flex items-center justify-start flex-1 gap-3 p-4 border-2 rounded-lg opacity-50 cursor-not-allowed border-slate-200"
                                    >
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <img src="/assets/ABA.png" alt="ABA" className="w-8 h-8 rounded" />
                                            <span className="text-xs font-bold text-slate-500">ABA</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* TERMS & CONDITIONS */}
                            <div className="pb-6 mb-6 border-b border-slate-200">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={termsAgreed}
                                        onChange={(e) => setTermsAgreed(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 cursor-pointer mt-0.5"
                                    />
                                    <span className="text-xs leading-relaxed text-slate-600 group-hover:text-slate-900">
                                        I agree to the <span className="font-semibold text-slate-900">Terms & Conditions</span>. Tokens are valid for 12 months.
                                    </span>
                                </label>
                            </div>

                            {/* PAY NOW BUTTON */}
                            <button
                                onClick={handleProcessPayment}
                                disabled={!termsAgreed || packages.length === 0 || paymentMethod !== "KHQR"}
                                className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition ${termsAgreed && paymentMethod === "KHQR"
                                    ? "bg-slate-900 text-white hover:bg-slate-800"
                                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                                    }`}
                            >
                                PAY NOW
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {/* SSL BADGE */}
                            <div className="flex items-center justify-center gap-1 mt-4 text-xs text-slate-400">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                SSL ENCRYPTED CHECKOUT
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PAYMENT MODAL --- */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex flex-col w-full max-w-sm overflow-hidden duration-200 bg-white shadow-xl rounded-2xl animate-in fade-in zoom-in">

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
                                className="transition-colors text-white/80 hover:text-white"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col items-center p-6 text-center">

                            {isProcessingPayment ? (
                                // Loading
                                <div className="flex flex-col items-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#E5223A] border-t-transparent mb-4"></div>
                                    <p className="text-sm text-slate-500">Generating QR Code...</p>
                                </div>
                            ) : paymentSuccess ? (
                                // Success
                                <div className="flex flex-col items-center py-12 duration-300 animate-in fade-in zoom-in">
                                    <div className="flex items-center justify-center w-16 h-16 mb-4 bg-green-100 rounded-full animate-pulse">
                                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="mb-2 text-lg font-semibold text-green-600">Payment Successful!</p>
                                    <p className="text-sm text-slate-500">Your tokens have been added to your account</p>
                                </div>
                            ) : paymentTimeout ? (
                                // Timeout
                                <div className="flex flex-col items-center py-12 transition-all duration-500 animate-in fade-in">
                                    <div className="flex items-center justify-center w-16 h-16 mb-4 bg-orange-100 rounded-full">
                                        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="mb-2 text-lg font-semibold text-orange-600">Payment Timeout</p>
                                    <p className="mb-6 text-sm text-slate-500">The QR code has expired. Please try again or contact support.</p>

                                    <div className="flex w-full gap-3">
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
                                    <div className="w-full p-3 mb-6 transition-all duration-300 border border-blue-200 rounded-lg bg-blue-50">
                                        {isCheckingStatus ? (
                                            <div className="flex items-center gap-2 text-sm text-blue-700">
                                                <div className="w-3 h-3 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                                                <span>Waiting for payment confirmation...</span>
                                            </div>
                                        ) : paymentError ? (
                                            <p className="text-sm text-red-700">{paymentError}</p>
                                        ) : (
                                            <p className="text-sm text-blue-700">Scan the QR code with your banking app to complete payment</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex w-full gap-3">
                                        <button
                                            onClick={handleCloseModal}
                                            disabled={isCheckingStatus}
                                            className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                        >
                                            {isCheckingStatus ? "Waiting for payment..." : "Cancel"}
                                        </button>
                                    </div>

                                    <p className="mt-4 text-xs text-slate-400">
                                        ✅ Waiting for payment via WebSocket • Expires in 5 minutes
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