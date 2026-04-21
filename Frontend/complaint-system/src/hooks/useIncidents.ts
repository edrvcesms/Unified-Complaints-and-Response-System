import { getIncidents, getIncidentById, getComplaintsByIncidentId, resolveIncident, rejectIncident, reviewIncident, markIncidentAsViewed, notifyHearing } from "../services/incidents/incidents";
import { endorseIncidentToLgu } from "../services/endorsement/incidentEndorsement";
import { getForwardedIncidents, getAllForwardedIncidents } from "../services/lgu/forwardedIncidents";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../main";
import type { Incident } from "../types/complaints/incident";
import type { Complaint } from "../types/complaints/complaint";

type ReviewIncidentPayload = {
  actions_taken: string;
  attachments?: File[];
  signal?: AbortSignal;
};

export const useIncidents = () => {
  const { data, isLoading, error } = useQuery<Incident[]>({
    queryKey: ["incidents"],
    queryFn: getIncidents,
  });

  return {
    incidents: data,
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

export const useIncidentComplaints = (incidentId: number, enabled: boolean = false) => {
  const { data, isLoading, error, refetch } = useQuery<Complaint[]>({
    queryKey: ["incidents", incidentId, "complaints"],
    queryFn: () => getComplaintsByIncidentId(incidentId),
    enabled: enabled, 
  });

  return {
    complaints: data,
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
    }
  });
  return mutation;
};

export const useRejectIncident = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["rejectIncident", incidentId],
    mutationFn: (payload: { actions_taken: string; attachments?: File[] }) =>
      rejectIncident(incidentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["assignedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["allForwardedIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["forwardedIncidents"] });
    }
  });
  return mutation;
}

export const useForwardedIncidents = (barangayId: number) => {
  const { data, isLoading, error } = useQuery<Incident[]>({
    queryKey: ["forwardedIncidents", barangayId],
    queryFn: () => getForwardedIncidents(barangayId),
    enabled: !!barangayId,
  });

  return {
    incidents: data,
    isLoading,
    error,
  };
};

export const useAllForwardedIncidents = () => {
  const { data, isLoading, error } = useQuery<Incident[]>({
    queryKey: ["allForwardedIncidents"],
    queryFn: getAllForwardedIncidents,
  });

  return {
    incidents: data,
    isLoading,
    error,
  };
};

export const useMarkIncidentAsViewed = () => {
  const mutation = useMutation({
    mutationFn: (incidentId: number) => markIncidentAsViewed(incidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
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