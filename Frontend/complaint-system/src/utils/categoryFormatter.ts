import { CATEGORY } from "../types/general/category";

/**
 * Formats backend category names to human-readable display names
 * @param categoryName - The category name from the backend (e.g., "stray_animals")
 * @returns Human-readable category name (e.g., "Stray Animals")
 */
export const formatCategoryName = (categoryName: string | undefined | null): string => {
  if (!categoryName) return "—";
  
  // Get the formatted name from CATEGORY constant
  const formattedName = CATEGORY[categoryName as keyof typeof CATEGORY];
  
  // Return formatted name if found, otherwise return the original with title case
  return formattedName || categoryName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
