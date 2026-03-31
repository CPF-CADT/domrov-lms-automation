import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import authService from "@/services/authService";

interface VerificationState {
    otp: string;
}

export default function EmailVerification() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = (location.state as any)?.email || "";

    const [form, setForm] = useState<VerificationState>({
        otp: "",
    });
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!email) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">
                        No email provided. Please sign up again.
                    </p>
                    <button
                        onClick={() => navigate("/signup", { replace: true })}
                        className="text-white px-6 py-2 rounded-full font-semibold"
                        style={{ backgroundColor: "#0b0b3a" }}
                    >
                        Back to Signup
                    </button>
                </div>
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!form.otp.trim()) {
            setError("Please enter the verification code");
            return;
        }

        setLoading(true);

        try {
            const response = await authService.verifyOtp({ email, otp: form.otp });
            
            // Store access token in localStorage
            localStorage.setItem('token', response.accessToken);
            
            // Dispatch storage event to sync auth context across tabs
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'token',
                newValue: response.accessToken,
                storageArea: localStorage,
            }));
            
            setSuccess("Email verified successfully! Redirecting to dashboard...");

            setTimeout(() => {
                navigate("/dashboard", { replace: true });
            }, 1500);
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : "Verification failed. Please try again.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setError(null);
        setSuccess(null);
        setResending(true);

        try {
            await authService.resendOtp({ email });
            setSuccess("Verification code sent! Check your email.");
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to resend code. Please try again.";
            setError(errorMessage);
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-white overflow-hidden">
            <div className="flex flex-col md:flex-row shadow-xl rounded-lg overflow-hidden w-full h-full md:h-auto md:max-w-4xl">
                {/* Left Panel - Hidden on mobile */}
                <aside
                    className="hidden md:flex text-white items-center justify-center md:w-80"
                    style={{ backgroundColor: "#0b0b3a" }}
                >
                    <div className="text-3xl font-extrabold tracking-wider">DOMROV</div>
                </aside>

                {/* Verification Card */}
                <main className="flex-1 flex items-center justify-center bg-white overflow-y-auto md:overflow-visible">
                    <div className="w-full max-w-md p-4 md:p-8 py-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                Verify Your Email
                            </h2>
                            <p className="text-sm text-gray-600">
                                We sent a verification code to{" "}
                                <span className="font-semibold">{email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-4">
                            <div className="flex flex-col">
                                <label className="text-xs text-gray-600 mb-2">
                                    Verification Code
                                </label>
                                <input
                                    name="otp"
                                    placeholder="Enter 6-digit code"
                                    value={form.otp}
                                    onChange={handleChange}
                                    maxLength={6}
                                    className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-center tracking-widest focus:ring-2 focus:ring-indigo-400 outline-none"
                                    style={{ color: "#222" }}
                                    autoComplete="off"
                                />
                            </div>

                            {error && (
                                <div className="text-red-600 text-xs p-3 bg-red-50 rounded">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="text-green-600 text-xs p-3 bg-green-50 rounded">
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full text-white px-4 py-3 rounded-full text-sm font-semibold shadow-md transition-all duration-150 disabled:opacity-50"
                                style={{ backgroundColor: "#0b0b3a", border: "none" }}
                            >
                                {loading ? "Verifying..." : "Verify Email"}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-600 mb-3">
                                Did not receive the code?
                            </p>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={resending}
                                className="text-indigo-700 hover:text-indigo-800 text-xs font-semibold disabled:opacity-50"
                            >
                                {resending ? "Sending..." : "Resend Code"}
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => navigate("/signup", { replace: true })}
                                className="text-gray-500 hover:text-indigo-700 text-xs"
                            >
                                ← Back to Signup
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
