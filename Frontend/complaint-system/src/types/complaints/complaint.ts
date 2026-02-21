import type { UserData } from "../general/user";
import type { BarangayData } from "../barangay/barangayAccount";
import type { Category } from "../general/category";
import type { Sector } from "../general/sector";
import type { PriorityLevel } from "../general/priorityLevel";

export interface Complaint {
  id: number;
  title: string;
  description: string;
  location_details: string;
  category_id: number;
  barangay_id: number;
  sector_id: number;
  priority_level_id: number;
  status: string;
  created_at: string;
  user: UserData;
  barangay: BarangayData;
  category: Category;
  sector: Sector;
  priority_level: PriorityLevel;
}

export type ComplaintStatus = "submitted" | "under_review" | "resolved";

export type ActivePage = "dashboard" | "complaints";

export interface WeeklyDataPoint {
  day: string;
  submitted: number;
  resolved: number;
}

export interface ComplaintStats {
  total: number;
  submitted: number;
  underReview: number;
  resolved: number;
}


export interface ComplaintsPageProps {
  complaints: Complaint[];
  isLoading: boolean;
}
