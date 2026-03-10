"use client";

import { useState } from "react";

interface ProfileDropdownProps {
  userName?: string;
  userEmail?: string;
  userInitials?: string;
  buttonClassName?: string;
  menuPosition?: "left" | "right";
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onThemesClick?: () => void;
  onStatusClick?: () => void;
  onTokenClick?: () => void;
  onLogoutClick?: () => void;
}

/**
 * ProfileDropdown - Reusable profile menu component
 * Displays user info and menu options with customizable actions
 */
export default function ProfileDropdown({
  userName = "Cheng ChanPanha",
  userEmail = "student@example.com",
  userInitials = "CC",
  buttonClassName = "",
  menuPosition = "right",
  onProfileClick,
  onSettingsClick,
  onThemesClick,
  onStatusClick,
  onTokenClick,
  onLogoutClick,
}: ProfileDropdownProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuItemClick = (callback?: () => void) => {
    setShowMenu(false);
    callback?.();
  };

  const defaultButtonClass = "h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-colors border-2 border-white/30";

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={buttonClassName || defaultButtonClass}
        aria-label="User profile"
      >
        {userInitials}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className={`absolute ${
              menuPosition === "left" ? "left-0" : "right-0"
            } top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50`}
          >
            {/* User Info Section */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {userName}
                  </p>
                  <p className="text-sm text-slate-500 truncate">
                    {userEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => handleMenuItemClick(onProfileClick)}
                className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              >
                Profile
              </button>
              <button
                onClick={() => handleMenuItemClick(onSettingsClick)}
                className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              >
                Settings
              </button>
              <button
                onClick={() => handleMenuItemClick(onThemesClick)}
                className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              >
                Themes
              </button>
              <button
                onClick={() => handleMenuItemClick(onStatusClick)}
                className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              >
                Status
              </button>
              <button
                onClick={() => {
                  console.log("Token clicked, onTokenClick:", onTokenClick);
                  handleMenuItemClick(onTokenClick);
                }}
                className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              >
                Token
              </button>
            </div>

            {/* Logout Section */}
            <div className="border-t border-slate-200 py-2">
              <button
                onClick={() => handleMenuItemClick(onLogoutClick)}
                className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors font-medium text-sm"
              >
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
