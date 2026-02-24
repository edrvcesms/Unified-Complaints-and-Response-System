import { getIncidents, getIncidentById, getComplaintsByIncidentId } from "../services/incidents/incidents";
import { useQuery } from "@tanstack/react-query";
import type { Incident } from "../types/complaints/incident";
import type { Complaint } from "../types/complaints/complaint";

export const useIncidents = () => {
  const { data, isLoading, error } = useQuery<Incident[]>({
    queryKey: ["incidents"],
    queryFn: getIncidents,
    refetchOnWindowFocus: false,
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
    refetchOnWindowFocus: false,
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
    refetchOnWindowFocus: false,
    enabled: enabled, // Control when to fetch
  });

  return {
    complaints: data,
    isLoading,
    error,
    refetch,
  };
};