import { useState, useMemo } from "react";
import type { Incident } from "../types/complaints/incident";
import type { StatusFilter, SeverityScoreFilter } from "../types/complaints/complaint";
import { ITEMS_PER_PAGE } from "../types/complaints/complaint";
import { formatCategoryName } from "../utils/categoryFormatter";

export type SortOption = "severity_score_desc" | "severity_score_asc" | "severity_level_desc" | "severity_level_asc" | "none";

const SEVERITY_LEVEL_ORDER = {
  "VERY_HIGH": 4,
  "HIGH": 3,
  "MEDIUM": 2,
  "LOW": 1,
};

export function useComplaintsFilter(complaints: Incident[]) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterSeverityScore, setFilterSeverityScore] = useState<SeverityScoreFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("none");

  const sorted = useMemo(() => {
    if (sortBy === "none") return complaints;

    const copy = [...complaints];
    
    switch (sortBy) {
      case "severity_score_desc":
        return copy.sort((a, b) => b.severity_score - a.severity_score);
      case "severity_score_asc":
        return copy.sort((a, b) => a.severity_score - b.severity_score);
      case "severity_level_desc":
        return copy.sort((a, b) => {
          const orderA = SEVERITY_LEVEL_ORDER[a.severity_level as keyof typeof SEVERITY_LEVEL_ORDER] || 0;
          const orderB = SEVERITY_LEVEL_ORDER[b.severity_level as keyof typeof SEVERITY_LEVEL_ORDER] || 0;
          return orderB - orderA;
        });
      case "severity_level_asc":
        return copy.sort((a, b) => {
          const orderA = SEVERITY_LEVEL_ORDER[a.severity_level as keyof typeof SEVERITY_LEVEL_ORDER] || 0;
          const orderB = SEVERITY_LEVEL_ORDER[b.severity_level as keyof typeof SEVERITY_LEVEL_ORDER] || 0;
          return orderA - orderB;
        });
      default:
        return copy;
    }
  }, [complaints, sortBy]);

  const filtered = useMemo(() => {
    return sorted.filter((c) => {
      const matchesStatus =
        filterStatus === "all" || c.severity_level === filterStatus;

      const matchesSeverityScore = () => {
        if (filterSeverityScore === "all") return true;
        const score = c.severity_score;
        switch (filterSeverityScore) {
          case "0-3.9":
            return score >= 0 && score < 4.0;
          case "4.0-5.9":
            return score >= 4.0 && score < 6.0;
          case "6.0-7.9":
            return score >= 6.0 && score < 8.0;
          case "8.0+":
            return score >= 8.0;
          default:
            return true;
        }
      };

      const q = search.toLowerCase();

      const matchesSearch =
        c.title.toLowerCase().includes(q) ||
        formatCategoryName(c.category?.category_name).toLowerCase().includes(q) ||
        c.barangay?.barangay_name?.toLowerCase().includes(q) ||
        String(c.id).includes(q);

      return matchesStatus && matchesSeverityScore() && matchesSearch;
    });
  }, [sorted, filterStatus, filterSeverityScore, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = (value: StatusFilter) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handleSeverityScoreFilterChange = (value: SeverityScoreFilter) => {
    setFilterSeverityScore(value);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  return {
    search,
    filterStatus,
    filterSeverityScore,
    sortBy,
    currentPage,
    paginated,
    filtered,
    totalPages,
    handleSearch,
    handleFilterChange,
    handleSeverityScoreFilterChange,
    handleSortChange,
    setCurrentPage,
  };
}