import type { StatusFilter } from "@/types/classCard";

interface StatusFiltersProps {
  activeStatus: StatusFilter;
  onChange: (status: StatusFilter) => void;
}

const statuses: StatusFilter[] = ["All", "Active", "End"];

export default function StatusFilters({
  activeStatus,
  onChange,
}: StatusFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <button
          key={status}
          onClick={() => onChange(status)}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${activeStatus === status
            ? "bg-primary text-white border-primary"
            : "bg-white text-slate-700 border-slate-200 hover:border-primary"
            }`}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
