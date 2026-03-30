"use client";

import { Link, useLocation } from "react-router-dom";
import { CTA_LINK, NAV_LINKS, type NavLinkItem } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";
import { ProfileDropdown } from "@/components/data-display";

// --- Helpers ---
const isActivePath = (pathname: string, path: string) => pathname === path;

/**
 * Header - Main navigation header with logo, nav links, and CTA.
 * Sticky positioned with blur backdrop effect.
 */
export default function Header() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-blue-100 shadow-sm">
      <div className="section-container py-4 flex items-center justify-between">
        {/* Logo Area */}
        <Link
          to="/"
          className="flex items-center gap-3 text-primary cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight">Domrov LMS</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex gap-6 text-sm font-bold text-slate-500">
            {NAV_LINKS.map((link: NavLinkItem) => (
              <Link
                key={link.href}
                to={link.href}
                className={`transition-colors ${isActivePath(location.pathname, link.href)
                  ? "text-primary"
                  : "hover:text-primary"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <ProfileDropdown
                buttonClassName="h-10 w-10 rounded-lg bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-white font-bold transition-colors border-2 border-white"
              />
            </div>
          ) : (
            <Link
              to={CTA_LINK.href}
              className="bg-primary hover:bg-primary-dark text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow-primary transition-all transform hover:scale-105"
            >
              {CTA_LINK.label}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
