import { getIncidents, getAllIncidents, getIncidentById, getComplaintsByIncidentId, resolveIncident, rejectIncident, reviewIncident, markIncidentAsViewed, notifyHearing } from "../services/incidents/incidents";
import { endorseIncidentToLgu } from "../services/endorsement/incidentEndorsement";
import { getForwardedIncidents, getAllForwardedIncidents } from "../services/lgu/forwardedIncidents";
import { fetchRejectionCategories } from "../services/category/rejectionCategory";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { queryClient } from "../main";
import type { Incident } from "../types/complaints/incident";
import type { Complaint } from "../types/complaints/complaint";
import { markHearingAsSuccessful, rescheduleHearing } from "../services/incidents/incidents";
import type { RejectionCategory } from "../types/general/category";
import type { PaginatedResponse, PaginationQueryParams } from "../types/general/pagination";
import type { IncidentQueryParams } from "../services/incidents/incidents";

type ReviewIncidentPayload = {
  actions_taken: string;
  attachments?: File[];
  signal?: AbortSignal;
};

export const useIncidents = (params: IncidentQueryParams) => {
  const { data, isLoading, error } = useQuery<PaginatedResponse<Incident>>({
    queryKey: ["incidents", params.page,
      params.page_size,
      params.search,
      params.sort,
      params.order,
      params.severity_level,
      params.date_from,
      params.date_to,],
    queryFn: () => getIncidents(params),
    placeholderData: keepPreviousData,
  });

  return {
    incidents: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
};

export const useAllIncidents = (params: IncidentQueryParams) => {
  const { data, isLoading, error } = useQuery<PaginatedResponse<Incident>>({
    queryKey: [
      "archiveIncidents",
      params.page,
      params.page_size,
      params.search,
      params.sort,
      params.order,
      params.complaint_status,
      params.date_from,
      params.date_to,
    ],
    queryFn: () => getAllIncidents(params),
    placeholderData: keepPreviousData,
  });

  return {
    incidents: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
};

export const useIncidentDetails = (incidentId: number) => {
  const { data, isLoading, error } = useQuery<Incident>({
    queryKey: ["incidents", incidentId],
    queryFn: () => getIncidentById(incidentId),
  });

  return {
    incident: data,
    isLoading,
    error,
  };
};

export const useIncidentComplaints = (incidentId: number, enabled: boolean = false, params: PaginationQueryParams) => {
  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Complaint[]>>({
    queryKey: ["incidents", incidentId, "complaints"],
    queryFn: () => getComplaintsByIncidentId(incidentId, params),
    enabled: enabled, 
  });

  return {
    complaints: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
  };
};

export const useResolveIncident = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["resolveIncident", incidentId],
    mutationFn: (payload: { actions_taken: string; attachments?: File[] }) =>
      resolveIncident(incidentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["assignedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["allForwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["forwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["archiveIncidents"] });
    }
  });
  return mutation;
};

export const useReviewIncident = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["reviewIncident", incidentId],
    mutationFn: (payload: ReviewIncidentPayload) =>
      reviewIncident(
        incidentId,
        { actions_taken: payload.actions_taken, attachments: payload.attachments },
        payload.signal
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["assignedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["allForwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["forwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["archiveIncidents"] });
    }
  });
  return mutation;
};

export const useForwardIncidentToLgu = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["forwardIncidentToLgu", incidentId],
    mutationFn: (payload: { actions_taken: string; attachments?: File[] }) =>
      endorseIncidentToLgu(incidentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["archiveIncidents"] });
    }
  });
  return mutation;
};

export const useRejectIncident = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["rejectIncident", incidentId],
    mutationFn: (payload: { actions_taken: string; rejection_category_id?: number; attachments?: File[] }) =>
      rejectIncident(incidentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["assignedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["allForwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["forwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["archiveIncidents"] });
    }
  });
  return mutation;
}

export const useRejectionCategories = () => {
  const { data, isLoading, error } = useQuery<RejectionCategory[]>({
    queryKey: ["rejectionCategories"],
    queryFn: fetchRejectionCategories,
  });

  return {
    rejectionCategories: data,
    isLoading,
    error,
  };
};

export const useForwardedIncidents = (barangayId: number, params: PaginationQueryParams) => {
  const { data, isLoading, error } = useQuery<PaginatedResponse<Incident>>({
    queryKey: ["forwardedIncidents", barangayId, params.page, params.page_size, params.search],
    queryFn: () => getForwardedIncidents(barangayId, params),
    placeholderData: keepPreviousData,
    enabled: !!barangayId,
  });

  return {
    incidents: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
};

export const useAllForwardedIncidents = (params: PaginationQueryParams) => {
  const { data, isLoading, error } = useQuery<PaginatedResponse<Incident>>({
    queryKey: ["allForwardedIncidents", params.page, params.page_size, params.search],
    queryFn: () => getAllForwardedIncidents(params),
    placeholderData: keepPreviousData,
  });

  return {
    incidents: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
};

export const useMarkIncidentAsViewed = () => {
  const mutation = useMutation({
    mutationFn: (incidentId: number) => markIncidentAsViewed(incidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", "complaints"] });
      queryClient.invalidateQueries({ queryKey: ["allForwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["forwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["archiveIncidents"] });
    }
  });
  return mutation;
};

export const useNotifyHearing = () => {
  const mutation = useMutation({
    mutationFn: ({ incidentId, hearingDate }: { incidentId: number; hearingDate: FormData }) => notifyHearing(incidentId, hearingDate),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", variables.incidentId] });
    }
  });
  return mutation;
};

export const useMarkHearingSuccess = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["markHearing", incidentId],
    mutationFn: (isSuccessful: boolean) => markHearingAsSuccessful(incidentId, isSuccessful),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId, "complaints"] });
    }
  });
  return mutation;
};

export const useRescheduleHearing = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["rescheduleHearing", incidentId],
    mutationFn: (hearingFormData: FormData) => rescheduleHearing(incidentId, hearingFormData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId, "complaints"] });
    }
  });
  return mutation;
};