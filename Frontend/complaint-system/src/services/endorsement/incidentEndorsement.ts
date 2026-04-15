import { incidentsApi } from "../axios/apiServices";

export const endorseIncidentToDepartment = async (
  incidentId: number,
  departmentAccountId: number,
  payload: { actions_taken: string }
): Promise<void> => {
  try {
    await incidentsApi.patch(`/assign/${incidentId}/department/${departmentAccountId}`, payload);
  } catch (error) {
    console.error("Error endorsing incident to department:", error);
    throw error;
  }
};

export const endorseIncidentToLgu = async (incidentId: number, payload: { actions_taken: string }): Promise<void> => {
  try {
    await incidentsApi.patch(`/${incidentId}/forward/lgu`, payload);
  } catch (error) {
    console.error("Error endorsing incident to LGU:", error);
    throw error;
  }
};
