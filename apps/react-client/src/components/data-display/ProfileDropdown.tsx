"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProfileDropdownProps {
  buttonClassName?: string;
  menuPosition?: "left" | "right";
}

/**
 * ProfileDropdown - Profile menu component connected to AuthContext
 * Displays user info from auth context and handles logout
 */
export default function ProfileDropdown({
  buttonClassName = "",
  menuPosition = "right",
}: ProfileDropdownProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const userName = user
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : "User";
  const userEmail = user?.email || "";
  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`
    : "U";

  const handleMenuItemClick = (callback?: () => void) => {
    setShowMenu(false);
    callback?.();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleDashboardClick = () => {
    navigate("/profile");
  };


  const defaultButtonClass =
    "h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-colors border-2 border-white/30";

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={buttonClassName || defaultButtonClass}
        aria-label="User profile"
      >
        {user?.profilePictureUrl ? (
          <img
            src={user.profilePictureUrl}
            alt={userName}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          userInitials
        )}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className={`absolute ${menuPosition === "left" ? "left-0" : "right-0"
              } top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50`}
          >
            {/* User Info Section */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                {user?.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt={userName}
                    className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {userInitials}
                  </div>
                )}
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
                onClick={() => handleMenuItemClick(handleDashboardClick)}
                className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleMenuItemClick(handleProfileClick)}
                className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              >
                Profile
              </button>

            </div>

            {/* Logout Section */}
            <div className="border-t border-slate-200 py-2">
              <button
                onClick={() => handleMenuItemClick(handleLogout)}
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
