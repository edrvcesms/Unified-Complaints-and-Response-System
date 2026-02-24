import { useState, useMemo } from "react";
import type { Complaint, StatusFilter } from "../types/complaints/complaint";
import { ITEMS_PER_PAGE } from "../types/complaints/complaint";

export function useComplaintsFilter(complaints: Complaint[]) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState<string>("");

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStatus =
        filterStatus === "all" || c.status === filterStatus;

      const q = search.toLowerCase();

      const matchesSearch =
        c.title.toLowerCase().includes(q) ||
        c.user?.first_name?.toLowerCase().includes(q) ||
        c.user?.last_name?.toLowerCase().includes(q) ||
        c.category?.category_name?.toLowerCase().includes(q) ||
        c.barangay?.barangay_name?.toLowerCase().includes(q) ||
        String(c.id).includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [complaints, filterStatus, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = (value: StatusFilter) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return {
    search,
    filterStatus,
    currentPage,
    paginated,
    filtered,
    totalPages,
    handleSearch,
    handleFilterChange,
    setCurrentPage,
  };
}