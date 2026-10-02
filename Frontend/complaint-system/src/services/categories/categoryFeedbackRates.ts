import { categoryApi } from "../axios/apiServices";
import type { CategoryFeedbackRates } from "../../types/general/categoryFeedbackRates";

export const getCategoryFeedbackRates = async (): Promise<CategoryFeedbackRates> => {
  return categoryApi.get<CategoryFeedbackRates>("/feedback-rates");
};
