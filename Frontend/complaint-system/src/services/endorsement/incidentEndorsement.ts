import { incidentsApi } from "../axios/apiServices";
import { buildIncidentActionFormData } from "../incidents/incidentActionFormData";

export const endorseIncidentToDepartment = async (
  incidentId: number,
  departmentAccountId: number,
  payload: { actions_taken: string; attachments?: File[] }
): Promise<void> => {
  try {
    const formData = buildIncidentActionFormData(payload.actions_taken, undefined, payload.attachments);
    await incidentsApi.patch(`/assign/${incidentId}/department/${departmentAccountId}`, formData);
  } catch (error) {
    console.error("Error endorsing incident to department:", error);
    throw error;
  }
};

export const endorseIncidentToLgu = async (
  incidentId: number,
  payload: { actions_taken: string; attachments?: File[] }
): Promise<void> => {
  try {
    const formData = buildIncidentActionFormData(payload.actions_taken, undefined, payload.attachments);
    await incidentsApi.patch(`/${incidentId}/forward/lgu`, formData);
  } catch (error) {
    console.error("Error endorsing incident to LGU:", error);
    throw error;
  }
};
