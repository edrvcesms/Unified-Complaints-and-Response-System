import { useQuery } from "@tanstack/react-query";
import {
  getComplaintById,
  getComplaints,
  getWeeklyComplaintStats,
} from "../services/complaints/complaints";
import type { Complaint, WeeklyComplaintStats } from "../types/complaints/complaint";

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

export const useComplaints = () => {
  const { data, isLoading, error } = useQuery<Complaint[]>({
    queryKey: COMPLAINT_KEYS.all,
    queryFn: getComplaints,
  });
  return {
    complaints: data,
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
