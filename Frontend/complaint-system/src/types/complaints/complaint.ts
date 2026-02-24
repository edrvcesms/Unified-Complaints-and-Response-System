import type { UserData } from "../general/user";
import type { BarangayData } from "../barangay/barangayAccount";
import type { Category } from "../general/category";
import type { Department } from "../department/department";
import type { PriorityLevel } from "../general/priorityLevel";

export interface Complaint {
  id: number;
  title: string;
  description: string;
  location_details: string;
  category_id: number;
  barangay_id: number;
  department_id: number;
  priority_level_id: number;
  status: string;
  created_at: string;
  user: UserData;
  barangay: BarangayData;
  category: Category;
  department: Department;
  priority_level: PriorityLevel;
}

export type ComplaintStatus = "submitted" | "under_review" | "resolved";

export type ActivePage = "dashboard" | "complaints" | "complaint_details";

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

export type StatusFilter = "all" | "submitted" | "under_review" | "resolved";

export interface ComplaintsPageProps {
  complaints: Complaint[];
  isLoading: boolean;
}

export interface ActionButtonsProps {
  complaint: Complaint;
  onReview: (id: number) => void;
  onResolve: (id: number) => void;
  isPending: boolean;
}

export const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Under Review", value: "under_review" },
  { label: "Resolved", value: "resolved" },
];

export const ITEMS_PER_PAGE = 8;