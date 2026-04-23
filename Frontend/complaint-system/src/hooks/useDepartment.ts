import { useQuery } from "@tanstack/react-query";
import { getAssignedIncidents, getAssignedIncidentsPerBarangay } from "../services/department/assignedIncidents";
import { getWeeklyDepartmentStats } from "../services/department/stats";
import { getAllDepartments } from "../services/department/department";
import type { Incident } from "../types/complaints/incident";
import type { Department } from "../types/department/department";

interface DailyCounts {
  [date: string]: {
    forwarded: number;
    under_review: number;
    resolved: number;
  };
}

interface WeeklyDepartmentStats {
  daily_counts: DailyCounts;
}

export const useAllDepartments = () => {
  const { data, isLoading, error } = useQuery<Department[]>({
    queryKey: ["allDepartments"],
    queryFn: getAllDepartments,
  });

  return {
    departments: data,
    isLoading,
    error,
  };
};

export const useAssignedIncidents = () => {
  const { data, isLoading, error } = useQuery<Incident[]>({
    queryKey: ["assignedIncidents"],
    queryFn: getAssignedIncidents,
  });

  return {
    incidents: data,
    isLoading,
    error,
  };
};

export const useAssignedIncidentsPerBarangay = (barangayId: number) => {
  const { data, isLoading, error } = useQuery<Incident[]>({
    queryKey: ["assignedIncidents", barangayId],
    queryFn: () => getAssignedIncidentsPerBarangay(barangayId),
    enabled: !!barangayId,
  });

  return {
    incidents: data,
    isLoading,
    error,
  };
};

export const useWeeklyDepartmentStats = () => {
  const { data, isLoading, error } = useQuery<WeeklyDepartmentStats>({
    queryKey: ["weeklyDepartmentStats"],
    queryFn: getWeeklyDepartmentStats,
  });

  return {
    stats: data,
    isLoading,
    error,
  };
};
