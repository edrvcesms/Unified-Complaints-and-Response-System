import { useState, useMemo } from "react";
import type { Incident } from "../types/complaints/incident";
import type { StatusFilter, SeverityScoreFilter } from "../types/complaints/complaint";
import { ITEMS_PER_PAGE } from "../types/complaints/complaint";
import { formatCategoryName } from "../utils/categoryFormatter";

export function useComplaintsFilter(complaints: Incident[]) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterSeverityScore, setFilterSeverityScore] = useState<SeverityScoreFilter>("all");
  const [search, setSearch] = useState<string>("");

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
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
  }, [complaints, filterStatus, filterSeverityScore, search]);

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

  return {
    search,
    filterStatus,
    filterSeverityScore,
    currentPage,
    paginated,
    filtered,
    totalPages,
    handleSearch,
    handleFilterChange,
    handleSeverityScoreFilterChange,
    setCurrentPage,
  };
}