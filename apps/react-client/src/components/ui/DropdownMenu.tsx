"use client";

import { useState, useEffect, useRef } from "react";

export interface DropdownMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  divider?: boolean;
  condition?: boolean; // Show item only if true
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  triggerClassName?: string;
}

export default function DropdownMenu({
  trigger,
  items,
  triggerClassName = "p-1 transition-colors rounded-lg hover:bg-slate-100 active:bg-slate-200",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        console.log("Clicking outside, closing menu");
        setIsOpen(false);
      }
    };

    if (isOpen) {
      console.log("Adding click listener");
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        console.log("Removing click listener");
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Filter items based on condition
  const visibleItems = items.filter((item) => item.condition !== false);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          console.log("Menu button clicked, isOpen:", isOpen);
          setIsOpen(!isOpen);
        }}
        className={triggerClassName}
        aria-label="Menu"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-[9999]"
          onClick={(e) => e.stopPropagation()}
        >
          {visibleItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                console.log("Menu item clicked:", item.label);
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                item.className || "text-slate-700 hover:bg-slate-50"
              } ${item.divider ? "border-t border-slate-100" : ""} ${
                index === 0 ? "first:rounded-t-lg" : ""
              } ${index === visibleItems.length - 1 ? "last:rounded-b-lg" : ""}`}
            >
              {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
