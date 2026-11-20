
import { useState, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { CreditPackageResponseDto } from "@/types/WalletTypes";
import walletService from "@/services/WalletApi";
import { deletePendingPayment, getPaymentHistory, getPaymentStatus, startPayment, uploadPaymentProof, type UserPayment } from "@/services/PaymentFlowApi";
import { STORAGE_KEYS, storage } from "@/lib/Storage";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import Khqr from "./Khqr";

const CUSTOM_PRICE_RATE = 0.00157302;
const PAYMENT_TIMEOUT = 300000;
const SUCCESS_DISPLAY_TIME = 3000;
type PaymentStatusEvent = { paymentId: string; status: "VERIFYING" | "PAID" | "UNPAID" | "FAILED"; message?: string };

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
    const [paymentData, setPaymentData] = useState<{ paymentId: string; message: string; packageName?: string; amount?: number; currency?: string } | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [paymentTimeout, setPaymentTimeout] = useState(false);
    const [selectedProof, setSelectedProof] = useState<File | null>(null);
    const [isUploadingProof, setIsUploadingProof] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState<UserPayment[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

    // --- Refs ---
    const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activePaymentIdRef = useRef<string | null>(null);
    const paymentSocketRef = useRef<Socket | null>(null);
    const paymentSuccessHandledRef = useRef<string | null>(null);

    // Keep the authenticated socket scoped to the active QR and receipt flow.
    useEffect(() => {
        if (!isPaymentModalOpen || !paymentData) {
            return;
        }

        const token = storage.get(STORAGE_KEYS.token);
        if (!token) {
            setPaymentError("Your session has expired. Sign in again to verify this payment.");
            return;
        }

        const socket = io(API_BASE_URL, {
            auth: { token },
            reconnectionAttempts: Infinity,
        });
        paymentSocketRef.current = socket;
        let statusRequestInFlight = false;
        const reconcileStatus = async () => {
            if (statusRequestInFlight || activePaymentIdRef.current !== paymentData.paymentId) return;
            statusRequestInFlight = true;
            try {
                const current = await getPaymentStatus(paymentData.paymentId);
                if (activePaymentIdRef.current !== paymentData.paymentId) return;
                if (current.status === "paid") {
                    socket.disconnect();
                    if (paymentSocketRef.current === socket) paymentSocketRef.current = null;
                    handlePaymentSuccess();
                    void refreshPaymentHistory();
                } else if (current.status === "verifying") {
                    setIsCheckingStatus(true);
                } else {
                    setIsCheckingStatus(false);
                    if (current.status === "failed") setPaymentError("Receipt verification failed. Please upload the receipt again.");
                }
            } catch {
                // Status refresh is best-effort; keep the QR and receipt flow usable.
            } finally {
                statusRequestInFlight = false;
            }
        };
        socket.on("connect", () => {
            void reconcileStatus();
        });
        const onReturnToPage = () => void reconcileStatus();
        window.addEventListener("focus", onReturnToPage);
        window.addEventListener("online", onReturnToPage);
        socket.on("connect_error", (err: Error) => {
            if (err.message === "Authentication required" || err.message === "Invalid access token") {
                setPaymentError("Your session has expired. Sign in again to verify this payment.");
            }
        });
        socket.on("PAYMENT_STATUS", (event: PaymentStatusEvent) => {
            if (!event.paymentId || event.paymentId !== activePaymentIdRef.current) return;
            if (event.status === "VERIFYING") {
                setIsCheckingStatus(true);
                setPaymentError(null);
            } else if (event.status === "PAID") {
                socket.disconnect();
                if (paymentSocketRef.current === socket) paymentSocketRef.current = null;
                handlePaymentSuccess();
                void refreshPaymentHistory();
            } else {
                setIsCheckingStatus(false);
                setPaymentError(event.message || (event.status === "UNPAID"
                    ? "No matching Bakong payment was found. Check the receipt and upload it again."
                    : "Receipt verification failed. Please try again."));
                if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
            }
        });
        return () => {
            window.removeEventListener("focus", onReturnToPage);
            window.removeEventListener("online", onReturnToPage);
            socket.removeAllListeners();
            socket.disconnect();
            if (paymentSocketRef.current === socket) paymentSocketRef.current = null;
        };
    }, [isPaymentModalOpen, paymentData?.paymentId]);

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
                    (balanceData as any)?.credits ??
                    (balanceData as any)?.availableCredits ??
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

                // PostgreSQL numeric columns are often serialized as strings.
                // Normalize API values here so rendering and payment calculations
                // receive numbers, as the DTO promises.
                const activePackages = rawPackages
                    .filter(pkg => pkg.isActive !== false)
                    .map(pkg => ({
                        ...pkg,
                        price: Number(pkg.price),
                        credits: Number(pkg.credits ?? pkg.tokens ?? 0),
                        bonusCredits: Number(pkg.bonusCredits ?? 0),
                    }))
                    .filter(pkg => Number.isFinite(pkg.price) && Number.isFinite(pkg.credits));
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
        const paymentId = activePaymentIdRef.current;
        if (paymentId && paymentSuccessHandledRef.current === paymentId) return;
        if (paymentId) paymentSuccessHandledRef.current = paymentId;
        paymentSocketRef.current?.disconnect();
        paymentSocketRef.current = null;
        setPaymentSuccess(true);
        setIsCheckingStatus(false);

        if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
        }

        setTimeout(() => {
            setIsPaymentModalOpen(false);
            setPaymentSuccess(false);
            setPaymentData(null);
            setSelectedProof(null);
            activePaymentIdRef.current = null;
            paymentSuccessHandledRef.current = null;
            setPaymentTimeout(false);
            loadBalance();
        }, SUCCESS_DISPLAY_TIME);
    };

    // --- Load Balance ---
    const loadBalance = async () => {
        try {
            const balanceData = await walletService.getWalletBalance();
            const extractedBalance =
                (balanceData as any)?.credits ??
                (balanceData as any)?.availableCredits ??
                (balanceData as any)?.balance ??
                (balanceData as any)?.creditBalance ??
                (balanceData as any)?.data?.balance ??
                (balanceData as any)?.data?.creditBalance ?? 0;
            setCurrentTokens(extractedBalance);
        } catch (err) {
            console.error("Failed to refresh balance:", err);
        }
    };

    const refreshPaymentHistory = async () => {
        setIsHistoryLoading(true);
        try {
            const result = await getPaymentHistory(1, 10);
            setPaymentHistory(result.payments);
            setHistoryError(null);
        } catch (err) {
            setHistoryError(err instanceof Error ? err.message : "Unable to load payment history.");
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleResumeReceiptUpload = (payment: UserPayment) => {
        if (payment.status !== 'pending') return;
        if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
        activePaymentIdRef.current = payment.id;
        paymentSuccessHandledRef.current = null;
        setPaymentData({ paymentId: payment.id, message: '', packageName: payment.packageName, amount: payment.amount, currency: payment.currency });
        setSelectedProof(null);
        setPaymentError(null);
        setPaymentTimeout(false);
        setPaymentSuccess(false);
        setIsCheckingStatus(false);
        setIsProcessingPayment(false);
        setIsPaymentModalOpen(true);
    };

    const handleDeletePayment = async (paymentId: string) => {
        setDeletingPaymentId(paymentId);
        setHistoryError(null);
        try {
            await deletePendingPayment(paymentId);
            await refreshPaymentHistory();
        } catch (err) {
            setHistoryError(err instanceof Error ? err.message : 'Unable to delete this payment.');
        } finally {
            setDeletingPaymentId(null);
        }
    };

    const refreshPaymentRecord = async (paymentId: string) => {
        try {
            const updated = await getPaymentStatus(paymentId);
            setPaymentHistory((current) => current.map((item) => item.id === paymentId ? updated : item));
        } catch (err) {
            setHistoryError(err instanceof Error ? err.message : "Unable to refresh this payment.");
        }
    };

    useEffect(() => {
        void refreshPaymentHistory();
    }, []);

    // --- Setup a timeout for the socket response after a receipt is uploaded ---
    const setupPaymentTimeout = () => {
        setIsCheckingStatus(true);
        setPaymentError(null);
        setPaymentTimeout(false);

        // Clear any existing timeout
        if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
        }

        // Set timeout: if WebSocket doesn't emit PAYMENT_STATUS within 5 minutes, show error
        paymentTimeoutRef.current = setTimeout(() => {
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
            setPaymentData(null);
            setSelectedProof(null);
            activePaymentIdRef.current = null;
            paymentSuccessHandledRef.current = null;

            try {
                const response = await startPayment(selectedPackId);
                if (!response.id || !response.qr) throw new Error("Payment service did not return a QR code");
                activePaymentIdRef.current = response.id;
                setPaymentData({ paymentId: response.id, message: response.qr, packageName: response.packageName, amount: Number(response.amount) });
                setIsProcessingPayment(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to initiate payment.");
                setIsProcessingPayment(false);
                setIsPaymentModalOpen(false);
            }
        } else {
            alert("Processing ABA Payment...");
        }
    };

    const handleUploadProof = async () => {
        if (!paymentData || !selectedProof) return;
        setIsUploadingProof(true);
        setupPaymentTimeout();
        try {
            const result = await uploadPaymentProof(paymentData.paymentId, selectedProof);
            if (result.status === "PAID") {
                handlePaymentSuccess();
                void refreshPaymentHistory();
            } else if (result.status === "UNPAID" || result.status === "FAILED") {
                if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
                setIsCheckingStatus(false);
                setPaymentError("No matching completed Bakong payment was found. Check the receipt and try again.");
            } else {
                await handleRefreshPaymentStatus();
            }
        } catch (err) {
            if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
            setIsCheckingStatus(false);
            setPaymentError(err instanceof Error ? err.message : "Could not verify this receipt");
            // The upload response may be lost while the server finishes verification.
            // Preserve the upload/OCR error unless reconciliation confirms payment.
            void handleRefreshPaymentStatus(true);
        } finally {
            setIsUploadingProof(false);
        }
    };

    const handleRefreshPaymentStatus = async (quiet = false) => {
        if (!paymentData) return;
        try {
            const current = await getPaymentStatus(paymentData.paymentId);
            if (current.status === "paid") {
                handlePaymentSuccess();
                void refreshPaymentHistory();
            } else if (current.status === "verifying") {
                setIsCheckingStatus(true);
            } else {
                if (current.status === "failed") {
                    setIsCheckingStatus(false);
                    if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
                    setPaymentError("Receipt verification failed. You can upload the receipt again.");
                } else if (!quiet) {
                    setIsCheckingStatus(false);
                    if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
                    setPaymentError("Payment is not confirmed yet. You can check again or upload the receipt.");
                }
            }
        } catch (err) {
            if (!quiet) setPaymentError(err instanceof Error ? err.message : "Unable to refresh payment status.");
        }
    };

    // If a receipt is being checked while the socket is reconnecting, poll the
    // persisted status briefly so a lost event cannot strand a completed payment.
    useEffect(() => {
        if (!isPaymentModalOpen || !paymentData || !isCheckingStatus) return;
        const timer = setInterval(() => void handleRefreshPaymentStatus(true), 5000);
        return () => clearInterval(timer);
    }, [isPaymentModalOpen, isCheckingStatus, paymentData?.paymentId]);

    // --- Retry Payment ---
    const handleRetryPayment = () => {
        setPaymentTimeout(false);
        setPaymentError(null);
        if (selectedProof) void handleUploadProof();
    };

    // --- Close Modal ---
    const handleCloseModal = () => {
        paymentSocketRef.current?.disconnect();
        paymentSocketRef.current = null;
        setIsPaymentModalOpen(false);
        if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
        setIsCheckingStatus(false);
        setPaymentData(null);
        setSelectedProof(null);
        activePaymentIdRef.current = null;
        setPaymentTimeout(false);
        setPaymentSuccess(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center flex-1 min-h-[50vh]">
                <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-4 border-4 rounded-full animate-spin border-slate-900 border-t-transparent"></div>
                <p className="text-slate-500">Loading credit packages...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
            <div className="w-full p-5">

                {/* HEADER */}
                <div className="flex items-center justify-between gap-6 p-4 mb-6 bg-white rounded-lg">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">AI Evaluation Credits</h1>
                        <p className="text-slate-500 text-xs mt-0.5">Paid credits are used after your free monthly evaluations.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Your Balance</p>
                        <p className="text-2xl font-bold text-blue-600">{currentTokens.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">Credits</p>
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
                            <span className="text-lg text-blue-600">|</span> SELECT A CREDIT PACKAGE
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
                                            <p className="mb-4 text-xs text-slate-600">Evaluation credits</p>

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

                            {/* CUSTOM CREDIT CALCULATOR */}
                        <div className="p-6 bg-white border rounded-2xl border-slate-200">
                            {/* TOP ROW - Title & Input & Button */}
                            <div className="flex items-start justify-between gap-6 mb-6">
                                {/* LEFT - Title & Description */}
                                <div className="flex-shrink-0 min-w-fit">
                                    <h3 className="mb-1 text-base font-bold text-slate-900">Custom<br />Credit<br />Calculator</h3>
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
                                        <span className="absolute text-xs font-semibold -translate-y-1/2 pointer-events-none right-4 top-1/2 text-slate-400">CREDITS</span>
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
                                <p className="mb-2 text-sm font-semibold text-slate-900">{summaryTokens.toLocaleString()} AI evaluation credits</p>
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
                                        I agree to the <span className="font-semibold text-slate-900">Terms & Conditions</span>. Purchased credits are valid for 12 months.
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

            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="payment-history-heading">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <h2 id="payment-history-heading" className="text-lg font-bold text-slate-900">Payment history</h2>
                        <p className="text-sm text-slate-500">Receipts and credit purchases linked to your account.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void refreshPaymentHistory()}
                        disabled={isHistoryLoading}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        {isHistoryLoading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
                {historyError && <p className="mb-3 text-sm text-red-600">{historyError}</p>}
                {isHistoryLoading && paymentHistory.length === 0 ? (
                    <p className="py-5 text-sm text-slate-500">Loading payment history…</p>
                ) : paymentHistory.length === 0 ? (
                    <p className="py-5 text-sm text-slate-500">No credit purchases yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="py-3 pr-4">Package</th>
                                    <th className="py-3 pr-4">Amount</th>
                                    <th className="py-3 pr-4">Credits</th>
                                    <th className="py-3 pr-4">Status</th>
                                    <th className="py-3">Date</th>
                                <th className="py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentHistory.map((payment) => (
                                    <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                                        <td className="py-3 pr-4 font-medium text-slate-900">{payment.packageName}</td>
                                        <td className="py-3 pr-4 text-slate-700">{payment.currency} {payment.amount.toFixed(2)}</td>
                                        <td className="py-3 pr-4 text-slate-700">{payment.credits.toLocaleString()}</td>
                                        <td className="py-3 pr-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${payment.status === "paid" ? "bg-green-100 text-green-700" : payment.status === "verifying" ? "bg-blue-100 text-blue-700" : payment.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-500">{new Date(payment.createdAt).toLocaleString()}</td>
                                        <td className="py-3">
                                            {payment.status !== "paid" && (
                                                <button
                                                    type="button"
                                                    onClick={() => void refreshPaymentRecord(payment.id)}
                                                    className="font-semibold text-blue-700 hover:underline"
                                                >
                                                    Refresh status
                                                </button>
                                            )}
                                            {payment.status === "pending" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleResumeReceiptUpload(payment)}
                                                    className="ml-4 font-semibold text-blue-700 hover:underline"
                                                >
                                                    Upload receipt
                                                </button>
                                            )}
                                            {payment.status === "pending" && (
                                                <button
                                                    type="button"
                                                    disabled={deletingPaymentId !== null}
                                                    onClick={() => void handleDeletePayment(payment.id)}
                                                    className="ml-4 font-semibold text-red-600 hover:underline disabled:opacity-50"
                                                >
                                                    {deletingPaymentId === payment.id ? "Deleting…" : "Delete"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* --- PAYMENT MODAL --- */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="relative flex flex-col w-full max-w-sm overflow-hidden duration-200 bg-white shadow-xl rounded-2xl animate-in fade-in zoom-in">
                        <button
                            type="button"
                            aria-label="Close payment"
                            onClick={handleCloseModal}
                            className="absolute right-3 top-3 z-10 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex flex-col items-center p-5 pt-12 text-center">

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
                                    <p className="text-sm text-slate-500">Your credits have been added to your account</p>
                                </div>
                            ) : paymentTimeout ? (
                                // Timeout
                                <div className="flex flex-col items-center py-12 transition-all duration-500 animate-in fade-in">
                                    <div className="flex items-center justify-center w-16 h-16 mb-4 bg-orange-100 rounded-full">
                                        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="mb-2 text-lg font-semibold text-orange-600">Payment is still processing</p>
                                    <p className="mb-6 text-sm text-slate-500">If you have already paid, upload the receipt again to recheck it.</p>

                                    <div className="w-full">
                                        <button
                                            onClick={handleRetryPayment}
                                            className="w-full py-2.5 rounded-lg bg-[#E5223A] text-white font-medium text-sm hover:bg-[#d41c33] shadow-sm transition-colors"
                                            disabled={!selectedProof}
                                        >
                                            Upload receipt again
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // QR Display
                                <>
                                    {paymentData?.message && (
                                        <div className="w-full mb-6">
                                            <Khqr
                                                name={paymentData.packageName ?? summaryName}
                                                amount={paymentData.amount ?? summaryPrice}
                                                qrValue={paymentData.message}
                                            />
                                        </div>
                                    )}

                                    {paymentData && !paymentData.message && (
                                        <div className="mb-6 w-full text-left">
                                            <h2 className="text-lg font-semibold text-slate-900">{paymentData.packageName}</h2>
                                            <p className="mt-1 text-sm text-slate-600">{paymentData.currency} {paymentData.amount?.toFixed(2)}</p>
                                            <p className="mt-2 text-sm text-slate-500">Upload your receipt to verify this payment.</p>
                                        </div>
                                    )}

                                    {paymentData && (
                                        <div className="w-full mb-5 text-left">
                                            <label htmlFor="payment-proof" className="block mb-2 text-sm font-semibold text-slate-800">
                                                Payment receipt
                                            </label>
                                            <input
                                                id="payment-proof"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                disabled={isCheckingStatus || isUploadingProof}
                                                onChange={(event) => setSelectedProof(event.target.files?.[0] ?? null)}
                                                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
                                            />
                                            <p className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP · Max 5 MB</p>
                                            {selectedProof && <p className="mt-1 truncate text-xs text-slate-600">Selected: {selectedProof.name}</p>}
                                            <button
                                                type="button"
                                                onClick={() => void handleUploadProof()}
                                                disabled={!selectedProof || isCheckingStatus || isUploadingProof}
                                                className="w-full mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                            >
                                                {isUploadingProof ? "Checking receipt…" : "Upload receipt"}
                                            </button>
                                        </div>
                                    )}

                                    {(isCheckingStatus || paymentError) && (
                                        <div className={`w-full rounded-lg p-3 mb-4 text-sm ${paymentError ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                                            {paymentError ?? "Verifying payment…"}
                                        </div>
                                    )}

                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
