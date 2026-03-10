"use client";

import { AuthProvider } from "@/domains/auth/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
