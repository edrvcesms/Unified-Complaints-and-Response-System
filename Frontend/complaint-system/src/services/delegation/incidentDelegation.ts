import { incidentsApi } from "../axios/apiServices";

export const delegateIncidentToDepartment = async (incidentId: number, departmentAccountId: number): Promise<void> => {
  try {
    await incidentsApi.patch(`/assign/${incidentId}/department/${departmentAccountId}`);
  } catch (error) {
    console.error(`Error delegating incident ${incidentId} to department ${departmentAccountId}:`, error);
    throw error;
  }
};

export const delegateIncidentToLgu = async (incidentId: number): Promise<void> => {
  try {
    await incidentsApi.patch(`/${incidentId}/forward/lgu`);
  } catch (error) {
    console.error(`Error forwarding incident ${incidentId} to LGU:`, error);
    throw error;
  };
};