/**
 * useDashboardFilters - Manages status filter state for dashboard.
 * Filters classes by their status (All, Active, End).
 */

import { useMemo, useState } from "react";
import type { StatusFilter, ClassCard } from "../types";

interface UseDashboardFiltersReturn {
  activeStatus: StatusFilter;
  setActiveStatus: (status: StatusFilter) => void;
  filteredClasses: ClassCard[];
}

export function useDashboardFilters(
  classes: ClassCard[],
): UseDashboardFiltersReturn {
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("All");

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
