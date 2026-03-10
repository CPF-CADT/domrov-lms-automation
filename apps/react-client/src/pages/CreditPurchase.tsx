import MainNavigation from "@/components/navigation/Navigation";
import CreditPurchaseClient from "@/features/CreditPurchase/CreditPurchaseClient";


/**
 * CreditPurchasePage - Main page for purchasing tokens.
 * Uses portal layout with sidebar navigation.
 */
export default function CreditPurchasePage() {
    return (
        <div className="flex min-h-screen bg-slate-50">
            <MainNavigation activeId="credit" />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <CreditPurchaseClient />
            </div>
        </div>
    );
}