import { useState, useMemo } from "react";
import type { Incident } from "../types/complaints/incident";
import type { StatusFilter, SeverityScoreFilter, ComplaintStatusFilter } from "../types/complaints/complaint";
import { ITEMS_PER_PAGE } from "../types/complaints/complaint";
import { formatCategoryName } from "../utils/categoryFormatter";
import { utcToLocal } from "../utils/dateUtils";

export type SortOption = 
  | "priority_high_to_low" 
  | "priority_low_to_high" 
  | "date_newest_first" 
  | "date_oldest_first"
  | "date_newest_last"
  | "date_oldest_last"
  | "none";

const SEVERITY_LEVEL_ORDER = {
  "VERY_HIGH": 4,
  "HIGH": 3,
  "MODERATE": 2,
  "LOW": 1,
};

// Combined priority score: severity level (weighted) + severity score
const getPriorityScore = (incident: Incident): number => {
  const levelWeight = SEVERITY_LEVEL_ORDER[incident.severity_level as keyof typeof SEVERITY_LEVEL_ORDER] || 0;
  // Weight level more heavily (multiply by 3) and add numeric score
  return (levelWeight * 3) + incident.severity_score;
};

export function useComplaintsFilter(complaints: Incident[], filterByComplaintStatus: boolean = false) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterComplaintStatus, setFilterComplaintStatus] = useState<ComplaintStatusFilter>("all");
  const [filterSeverityScore, setFilterSeverityScore] = useState<SeverityScoreFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("date_oldest_first");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Calculate min and max dates from incidents
  const { minDate, maxDate } = useMemo(() => {
    if (!complaints || complaints.length === 0) {
      return { minDate: "", maxDate: new Date().toISOString().split('T')[0] };
    }

    const dates = complaints.map(c => utcToLocal(c.first_reported_at).getTime());
    const earliestDate = new Date(Math.min(...dates));
    const today = new Date();

    return {
      minDate: earliestDate.toISOString().split('T')[0],
      maxDate: today.toISOString().split('T')[0]
    };
  }, [complaints]);

  const sorted = useMemo(() => {
    if (sortBy === "none") return complaints;

    const copy = [...complaints];
    
    switch (sortBy) {
      case "priority_high_to_low":
        return copy.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
      case "priority_low_to_high":
        return copy.sort((a, b) => getPriorityScore(a) - getPriorityScore(b));
      case "date_newest_first":
        return copy.sort((a, b) => utcToLocal(b.first_reported_at).getTime() - utcToLocal(a.first_reported_at).getTime());
      case "date_oldest_first":
        return copy.sort((a, b) => utcToLocal(a.first_reported_at).getTime() - utcToLocal(b.first_reported_at).getTime());
      case "date_newest_last":
        return copy.sort((a, b) => utcToLocal(b.last_reported_at).getTime() - utcToLocal(a.last_reported_at).getTime());
      case "date_oldest_last":
        return copy.sort((a, b) => utcToLocal(a.last_reported_at).getTime() - utcToLocal(b.last_reported_at).getTime());
      default:
        return copy;
    }
  }, [complaints, sortBy]);

  const filtered = useMemo(() => {
    return sorted.filter((c) => {
      let matchesStatus = true;

      if (filterByComplaintStatus) {
        // Filter by complaint status (from first complaint in cluster)
        const complaintStatus = c.complaint_clusters?.[0]?.complaint?.status;
        matchesStatus = filterComplaintStatus === "all" || complaintStatus === filterComplaintStatus;
      } else {
        // Filter by severity level
        matchesStatus = filterStatus === "all" || c.severity_level === filterStatus;
      }

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

      const matchesDate = () => {
        if (!dateFrom && !dateTo) return true;
        
        const incidentDate = utcToLocal(c.first_reported_at);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;
        
        if (fromDate && toDate) {
          toDate.setHours(23, 59, 59, 999);
          return incidentDate >= fromDate && incidentDate <= toDate;
        } else if (fromDate) {
          return incidentDate >= fromDate;
        } else if (toDate) {
          toDate.setHours(23, 59, 59, 999);
          return incidentDate <= toDate;
        }
        
        return true;
      };

      const q = search.toLowerCase();

      const matchesSearch =
        c.title.toLowerCase().includes(q) ||
        formatCategoryName(c.category?.category_name).toLowerCase().includes(q) ||
        c.barangay?.barangay_name?.toLowerCase().includes(q) ||
        String(c.id).includes(q);

      return matchesStatus && matchesSeverityScore() && matchesDate() && matchesSearch;
    });
  }, [sorted, filterStatus, filterComplaintStatus, filterSeverityScore, search, dateFrom, dateTo, filterByComplaintStatus]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = (value: StatusFilter) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handleComplaintStatusFilterChange = (value: ComplaintStatusFilter) => {
    setFilterComplaintStatus(value);
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

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
    setCurrentPage(1);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
    setCurrentPage(1);
  };

  const handleClearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  return {
    search,
    filterStatus,
    filterComplaintStatus,
    filterSeverityScore,
    sortBy,
    dateFrom,
    dateTo,
    minDate,
    maxDate,
    currentPage,
    paginated,
    filtered,
    totalPages,
    handleSearch,
    handleFilterChange,
    handleComplaintStatusFilterChange,
    handleSeverityScoreFilterChange,
    handleSortChange,
    handleDateFromChange,
    handleDateToChange,
    handleClearDateFilter,
    setCurrentPage,
  };
}