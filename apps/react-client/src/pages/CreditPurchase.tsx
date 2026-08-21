import { useNavigate } from "react-router-dom";
import MainNavigation from "@/components/navigation/Navigation";
import CreditPurchaseClient from "@/features/CreditPurchase/CreditPurchaseClient";
import ProfileDropdown from "@/components/data-display/ProfileDropdown";

/**
 * CreditPurchasePage - Main page for purchasing tokens.
 * Uses portal layout with sidebar navigation.
 */
export default function CreditPurchasePage() {
    const navigate = useNavigate();
    return (
        <div className="flex min-h-screen bg-slate-50">
            <MainNavigation activeId="credit" />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-blue-700 rounded-lg transition-colors" title="Go back to dashboard">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <p className="text-xs text-blue-100">Dashboard</p>
                            <h1 className="text-xl font-semibold">Wallet</h1>
                        </div>
                    </div>
                    <ProfileDropdown buttonClassName="h-10 w-10 rounded-lg bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-white font-bold transition-colors border-2 border-white" />
                </header>
                <CreditPurchaseClient />
            </div>
        </div>
    );
}