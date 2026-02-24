import type { UserData } from "../general/user";
import type { BarangayData } from "../barangay/barangayAccount";
import type { Category } from "../general/category";
import type { Department } from "../department/department";
import type { Attachment } from "../general/attachment";

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
  attachment: Attachment[];
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

export type StatusFilter = "all" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type SeverityScoreFilter = "all" | "0-3.9" | "4.0-5.9" | "6.0-7.9" | "8.0+";

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
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Very High", value: "VERY_HIGH" },
];

export const SEVERITY_SCORE_FILTERS: { label: string; value: SeverityScoreFilter }[] = [
  { label: "All Scores", value: "all" },
  { label: "0-3.9 (Low)", value: "0-3.9" },
  { label: "4.0-5.9 (Medium)", value: "4.0-5.9" },
  { label: "6.0-7.9 (High)", value: "6.0-7.9" },
  { label: "8.0+ (Critical)", value: "8.0+" },
];

export const ITEMS_PER_PAGE = 8;