import { departmentApi } from "../axios/apiServices";
import type { Department } from "../../types/department/department";

export const getAllDepartments = async (): Promise<Department[]> => {
  try {
    return await departmentApi.get('/');
  } catch (error) {
    console.error("Error fetching all departments:", error);
    throw error;
  }
};
