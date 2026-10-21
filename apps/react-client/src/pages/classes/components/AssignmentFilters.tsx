"use client";

type FilterType = "upcoming" | "past-due" | "completed";

interface AssignmentFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

/**
 * AssignmentFilters - Filter tabs for assignments (Upcoming, Past due, Completed).
 */
export default function AssignmentFilters({ activeFilter, onFilterChange }: AssignmentFiltersProps) {
  const filters: { id: FilterType; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past-due", label: "Past due" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="flex gap-6 border-b border-slate-200">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
            activeFilter === filter.id
              ? "text-blue-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {filter.label}
          {activeFilter === filter.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      ))}
    </div>
  );
}
