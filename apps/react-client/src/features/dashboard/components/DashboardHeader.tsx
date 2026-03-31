"use client";

import { Link } from "react-router-dom";
import { ProfileDropdown } from "@/components/data-display";
import type { StatusFilter } from "@/types/classCard";

interface DashboardHeaderProps {
  activeStatus: StatusFilter;
  onChangeStatus: (status: StatusFilter) => void;
  onJoinClass?: () => void;
}

export default function DashboardHeader({
  onJoinClass,
}: DashboardHeaderProps) {

  return (
    <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-blue-100">Dashboard</p>
        <h1 className="text-xl font-semibold">Classes</h1>
      </div>

      <div className="flex items-center space-x-3">
        <Link
          to="/class/create"
          className="px-4 py-2 bg-white text-primary font-semibold rounded-md shadow-sm hover:bg-blue-50"
        >
          + Create Class
        </Link>
        <button
          className="px-4 py-2 bg-white text-primary font-semibold rounded-md shadow-sm hover:bg-blue-50"
          onClick={onJoinClass}
        >
          + Join Class
        </button>
        <ProfileDropdown
          buttonClassName="h-10 w-10 rounded-lg bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-white font-bold transition-colors border-2 border-white"
        />
      </div>
    </header>
  );
}
