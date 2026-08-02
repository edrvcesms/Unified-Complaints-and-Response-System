import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getComplaintById,
  getComplaints,
  getWeeklyComplaintStats,
} from "../services/complaints/complaints";
import type { Complaint, WeeklyComplaintStats } from "../types/complaints/complaint";
import type { PaginatedResponse } from "../types/general/pagination";
import type { PaginationQueryParams } from "../types/general/pagination";

const DEFAULT_COMPLAINT_PARAMS: PaginationQueryParams = {
  page: 1,
  page_size: 10,
};

export const COMPLAINT_KEYS = {
  all:        ["complaints", "all"]         as const,
  submitted:  ["complaints", "submitted"]   as const,
  underReview:["complaints", "under_review"]as const,
  resolved:   ["complaints", "resolved"]    as const,
};

export const useComplaintDetails = (complaintId: number) => {
  const { data, isLoading, error } = useQuery<Complaint>({
    queryKey: ["complaints", complaintId],
    queryFn: () => getComplaintById(complaintId),
  });
  return {
    complaint: data,
    isLoading,
    error,
  };
}

export const useComplaints = (params: PaginationQueryParams = DEFAULT_COMPLAINT_PARAMS) => {
  const { data, isLoading, error } = useQuery<PaginatedResponse<Complaint>>({
    queryKey: ["complaints", params.page, params.page_size, params.search],
    queryFn: () => getComplaints(params),
    placeholderData: keepPreviousData,
  });
  return {
    complaints: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
}

export const useWeeklyComplaintStats = () => {
  const { data, isLoading, error } = useQuery<WeeklyComplaintStats>({
    queryKey: ["complaints", "stats", "weekly"],
    queryFn: getWeeklyComplaintStats,
  });
  return {
    stats: data,
    isLoading,
    error,
  };
}
