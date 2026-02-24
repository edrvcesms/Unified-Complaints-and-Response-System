import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getComplaintById,
  getComplaints,
  getWeeklyComplaintStats,
} from "../services/complaints/complaints";
import {
  reviewComplaint,
  resolveComplaint,
} from "../services/complaints/manageComplaints";
import type { Complaint } from "../types/complaints/complaint";

export const COMPLAINT_KEYS = {
  all:        ["complaints", "all"]         as const,
  submitted:  ["complaints", "submitted"]   as const,
  underReview:["complaints", "under_review"]as const,
  resolved:   ["complaints", "resolved"]    as const,
};

export const useComplaintDetails = (complaintId: number) =>
  useQuery<Complaint>({
    queryKey: ["complaints", complaintId],
    queryFn:  () => getComplaintById(complaintId),
    refetchOnWindowFocus: false,
    enabled: !!complaintId,
  });

export const useComplaints = () =>
  useQuery<Complaint[]>({
    queryKey: COMPLAINT_KEYS.all,
    queryFn:  getComplaints,
    refetchOnWindowFocus: false,
  });

export const useWeeklyComplaintStats = () =>
  useQuery({
    queryKey: ["complaints", "weekly_stats"],
    queryFn:  getWeeklyComplaintStats,
    refetchOnWindowFocus: false
  });

export const useReviewComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (complaintId: number) => reviewComplaint(complaintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
};

export const useResolveComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (complaintId: number) => resolveComplaint(complaintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
};