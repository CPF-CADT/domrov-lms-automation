"use client";

import { useState } from "react";
import DropdownMenu from "@/components/ui/DropdownMenu";
import type { ClassCard as ClassCardType } from "@/types/classCard";
import { MoreVertical, Edit2, Users, LogOut, Trash2, Share2 } from "lucide-react";

interface ClassCardProps {
  classItem: ClassCardType;
  onOpen?: (id: string, role?: string) => void;
  isActive?: boolean;
  onEdit?: (id: string) => void;
  onViewMembers?: (id: string) => void;
  onLeaveClass?: (id: string) => void;
  onDeleteClass?: (id: string) => void;
  onShareClass?: (id: string) => void;
}

/**
 * ClassCard - Displays a class with clean, simple design showing all backend data.
 */
export default function ClassCard({
  classItem,
  onOpen,
  isActive = false,
  onEdit,
  onViewMembers,
  onLeaveClass,
  onDeleteClass,
  onShareClass,
}: ClassCardProps) {
  const [copied, setCopied] = useState(false);

  const ownerName = classItem.owner
    ? `${classItem.owner.firstName} ${classItem.owner.lastName}`
    : "Unknown";

  const statusColor =
    classItem.status === "ACTIVE"
      ? "bg-green-100 text-green-700"
      : classItem.status === "END"
        ? "bg-gray-100 text-gray-600"
        : "bg-yellow-100 text-yellow-700";

  const roleColor =
    classItem.role === "Teacher"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";

  const handleCopyCode = async () => {
    if (classItem.joinCode) {
      try {
        await navigator.clipboard.writeText(classItem.joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = classItem.joinCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <article className={`relative bg-white rounded-xl border shadow-sm transition-all duration-200 overflow-visible flex flex-col h-[340px] cursor-pointer ${isActive
        ? "border-blue-500 shadow-lg ring-2 ring-blue-200 scale-[1.02]"
        : "border-slate-200 hover:shadow-lg hover:border-slate-300 hover:scale-[1.02]"
      }`}>
      {/* Cover Image or Placeholder */}
      {classItem.coverImageUrl ? (
        <img
          src={classItem.coverImageUrl}
          alt={classItem.name}
          className="object-cover w-full h-28 shrink-0"
        />
      ) : (
        <div className="flex items-center justify-center w-full transition-colors duration-200 h-28 bg-gradient-to-br from-slate-100 to-slate-50 shrink-0 hover:from-slate-200 hover:to-slate-100">
          <span className="text-4xl font-bold text-slate-300">
            {classItem.name
              ?.split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "CL"}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="flex flex-col flex-1 min-h-0 p-4 overflow-visible">
        {/* Header: Name + Status + Menu */}
        <div className="flex items-start justify-between gap-2 mb-2 relative z-20">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
              {classItem.name}
            </h3>
          </div>

          {/* Status Badge */}
          <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${statusColor}`}>
            {classItem.status}
          </span>

          {/* Menu Button */}
          <DropdownMenu
            trigger={<MoreVertical className="w-4 h-4 text-slate-600" />}
            items={[
              {
                label: "Edit Class",
                icon: <Edit2 className="w-4 h-4" />,
                onClick: () => onEdit?.(classItem.id?.toString?.() ?? ""),
              },
              {
                label: "View Members",
                icon: <Users className="w-4 h-4" />,
                onClick: () => onViewMembers?.(classItem.id?.toString?.() ?? ""),
              },
              {
                label: "Share Class",
                icon: <Share2 className="w-4 h-4" />,
                onClick: () => onShareClass?.(classItem.id?.toString?.() ?? ""),
                divider: true,
              },
              {
                label: "Leave Class",
                icon: <LogOut className="w-4 h-4" />,
                onClick: () => {
                  if (confirm("Are you sure you want to leave this class?")) {
                    onLeaveClass?.(classItem.id?.toString?.() ?? "");
                  }
                },
                className: "text-orange-600 hover:bg-orange-50",
                divider: true,
              },
              {
                label: "Delete Class",
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => {
                  if (confirm("Are you sure you want to delete this class? This cannot be undone.")) {
                    onDeleteClass?.(classItem.id?.toString?.() ?? "");
                  }
                },
                className: "text-red-600 hover:bg-red-50",
                condition: classItem.role === "Teacher",
              },
            ]}
            triggerClassName="p-1 transition-colors rounded-lg hover:bg-slate-100 active:bg-slate-200"
          />
        </div>

        {/* Description */}
        <p className="h-8 mb-2 text-xs text-slate-600 line-clamp-2">
          {classItem.description || "No description"}
        </p>

        {/* Owner Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="truncate">{ownerName}</span>
        </div>

        {/* Role Badge */}
        <div className="h-5 my-2">
          {classItem.role && (
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${roleColor}`}>
              {classItem.role}
            </span>
          )}
        </div>

        {/* Join Code (only show for teachers) */}
        <div className="h-5 text-xs">
          {classItem.joinCode && classItem.role === "Teacher" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Code:</span>
              <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono text-xs">
                {classItem.joinCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="p-1 transition-colors rounded hover:bg-slate-100"
                title={copied ? "Copied!" : "Copy code"}
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 mt-auto border-t border-slate-100">
          <button
            className="w-full px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-slate-900 hover:bg-slate-800"
            onClick={onOpen ? () => onOpen(classItem.id?.toString?.() ?? "", classItem.role) : undefined}
            aria-label="View class details"
          >
            View Class
          </button>
        </div>
      </div>
    </article>
  );
}
