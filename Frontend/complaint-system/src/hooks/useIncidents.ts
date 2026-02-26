import { getIncidents, getIncidentById, getComplaintsByIncidentId, resolveIncident, reviewIncident } from "../services/incidents/incidents";
import { delegateIncidentToLgu } from "../services/delegation/incidentDelegation";
import { getForwardedIncidents, getAllForwardedIncidents } from "../services/lgu/forwardedIncidents";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../main";
import type { Incident } from "../types/complaints/incident";
import type { Complaint } from "../types/complaints/complaint";

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
    mutationFn: () => resolveIncident(incidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
    }
  });
  return mutation;
};

export const useReviewIncident = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["reviewIncident", incidentId],
    mutationFn: () => reviewIncident(incidentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
    }
  });
  return mutation;
};

export const useForwardIncidentToLgu = (incidentId: number) => {
  const mutation = useMutation({
    mutationKey: ["forwardIncidentToLgu", incidentId],
    mutationFn: () => delegateIncidentToLgu(incidentId),
    onSuccess: () => {
      // Invalidate both incident list and specific incident details
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
    }
  });
  return mutation;
};

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

/**
 * Hook for LGU officials to fetch all forwarded incidents from all barangays
 */
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