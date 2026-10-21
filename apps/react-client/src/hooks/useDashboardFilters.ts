/**
 * useDashboardFilters - Manages status filter state for dashboard.
 * Filters classes by their status (All, Active, End).
 */

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { StatusFilter, ClassCard } from "../types";

interface UseDashboardFiltersReturn {
  activeStatus: StatusFilter;
  setActiveStatus: (status: StatusFilter) => void;
  filteredClasses: ClassCard[];
}

export function useDashboardFilters(
  classes: ClassCard[],
): UseDashboardFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const activeStatus: StatusFilter = statusParam === "Active" || statusParam === "End" ? statusParam : "All";

  const setActiveStatus = (status: StatusFilter) => {
    const next = new URLSearchParams(searchParams);
    if (status === "All") next.delete("status");
    else next.set("status", status);
    setSearchParams(next);
  };

  const filteredClasses = useMemo(() => {
    if (activeStatus === "All") {
      return classes;
    }
    return classes.filter(
      (c) => c.status?.toUpperCase() === activeStatus.toUpperCase()
    );
  }, [classes, activeStatus]);

  return {
    activeStatus,
    setActiveStatus,
    filteredClasses,
  };
}
