"use client";

import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { CTA_LINK, NAV_LINKS, type NavLinkItem } from "@/config/Navigation";
import { useAuth } from "@/context/AuthContext";
import ProfileDropdown from "@/components/data-display/ProfileDropdown";

// --- Helpers ---
const isActivePath = (pathname: string, path: string) => pathname === path;

/**
 * Header - Main navigation header with logo, nav links, and CTA.
 * Sticky positioned with blur backdrop effect.
 */
export default function Header({ variant = "default" }: { variant?: "default" | "landing" }) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (variant === "landing") {
    const publicLinks = [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/docs", label: "User Guide" },
    ];

    return (
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="Domrov LMS home">
            <span className="landing-brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M13.826 30.574c2.894-.691 6.398-1.096 10.174-1.096 3.776 0 7.28.405 10.174 1.096 2.74.654 5.823 2.193 7.182 3.262L24.849 7.36a1 1 0 0 0-1.698 0L6.644 33.836c1.36-1.069 4.441-2.608 7.182-3.262Z" fill="currentColor"/></svg></span>
            <span>Domrov <small>LMS</small></span>
          </Link>

          <nav className="landing-nav" aria-label="Main navigation">
            {publicLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
          </nav>
          <Link to={isAuthenticated ? "/dashboard" : "/login"} className="landing-header-cta">
            {isAuthenticated ? "Dashboard" : "Log in"}
          </Link>
          <button
            type="button"
            className="landing-menu-toggle"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {mobileOpen && (
          <nav id="landing-mobile-nav" className="landing-mobile-nav" aria-label="Mobile navigation">
            {publicLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>{link.label}</a>)}
            <Link to={isAuthenticated ? "/dashboard" : "/login"} onClick={() => setMobileOpen(false)}>
              {isAuthenticated ? "Dashboard" : "Log in"}
            </Link>
          </nav>
        )}
      </header>
    );
  }

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
