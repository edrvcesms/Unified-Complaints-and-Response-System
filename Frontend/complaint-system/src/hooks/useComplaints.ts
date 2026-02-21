// ─── hooks/useComplaints.ts ───────────────────────────────────────────────────
// Wraps all complaint API calls in React Query hooks.
// Provides fetching, status updates, and cache invalidation.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getComplaints,
  getSubmittedComplaints,
  getUnderReviewComplaints,
  getResolvedComplaints,
} from "../services/complaints/complaints";
import {
  reviewComplaint,
  resolveComplaint,
} from "../services/complaints/manageComplaints";
import type { Complaint } from "../types/complaints/complaint";

// ── Query keys — centralised for easy cache invalidation ─────────────────────
export const COMPLAINT_KEYS = {
  all:        ["complaints", "all"]         as const,
  submitted:  ["complaints", "submitted"]   as const,
  underReview:["complaints", "under_review"]as const,
  resolved:   ["complaints", "resolved"]    as const,
};

// ── Fetch all complaints ──────────────────────────────────────────────────────
export const useComplaints = () =>
  useQuery<Complaint[]>({
    queryKey: COMPLAINT_KEYS.all,
    queryFn:  getComplaints,
  });

// ── Fetch by status ───────────────────────────────────────────────────────────
export const useSubmittedComplaints = () =>
  useQuery<Complaint[]>({
    queryKey: COMPLAINT_KEYS.submitted,
    queryFn:  getSubmittedComplaints,
  });

export const useUnderReviewComplaints = () =>
  useQuery<Complaint[]>({
    queryKey: COMPLAINT_KEYS.underReview,
    queryFn:  getUnderReviewComplaints,
  });

export const useResolvedComplaints = () =>
  useQuery<Complaint[]>({
    queryKey: COMPLAINT_KEYS.resolved,
    queryFn:  getResolvedComplaints,
  });

// ── Mark as Under Review mutation ─────────────────────────────────────────────
export const useReviewComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (complaintId: number) => reviewComplaint(complaintId),
    onSuccess: () => {
      // Invalidate all complaint queries so the table/stats refresh
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
};

// ── Mark as Resolved mutation ─────────────────────────────────────────────────
export const useResolveComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (complaintId: number) => resolveComplaint(complaintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
};