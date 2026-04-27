import type { RejectionCategory } from "../../types/general/category";
import { categoryApi } from "../axios/apiServices";

export const fetchRejectionCategories = async (): Promise<RejectionCategory[]> => {
  try {
    const categories = await categoryApi.get<RejectionCategory[]>("/rejection");
    return categories;
  } catch (error) {
    console.error("Error fetching rejection categories:", error);
    throw error;
  } 
};