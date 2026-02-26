import { incidentsApi } from "../axios/apiServices";

export const delegateIncidentToDepartment = async (incidentId: number, departmentAccountId: number): Promise<void> => {
  await incidentsApi.patch(`/assign/${incidentId}/department/${departmentAccountId}`);
};

export const delegateIncidentToLgu = async (incidentId: number): Promise<void> => {
  await incidentsApi.patch(`/${incidentId}/forward/lgu`);
};