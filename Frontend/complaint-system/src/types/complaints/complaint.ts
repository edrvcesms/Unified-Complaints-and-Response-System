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
  longitude?: number;
  latitude?: number;
  is_rejected_by_lgu?: boolean;
  is_rejected_by_department?: boolean;
}

export type ComplaintStatus = "submitted" | "resolved" | "forwarded_to_lgu" | "forwarded_to_department" | "resolved_by_department" | "resolved_by_barangay" | "reviewed_by_department" | "reviewed_by_barangay" | "reviewed_by_lgu" | "resolved_by_lgu";

export type ActivePage = "dashboard" | "complaints" | "complaint_details";

export interface WeeklyDataPoint {
  day: string;
  submitted: number;
  resolved: number;
  forwarded?: number;
  under_review?: number;
}

export interface ComplaintStats {
  total: number;
  submitted: number;
  underReview: number;
  resolved: number;
  forwarded?: number;
}

export interface DailyComplaintCounts {
  submitted: number;
  resolved: number;
  forwarded: number;
  under_review: number;
}

export interface WeeklyComplaintStats {
  total_submitted: number;
  total_resolved: number;
  total_forwarded: number;
  total_under_review: number;
  daily_counts: {
    [date: string]: DailyComplaintCounts;
  };
}


export interface ComplaintsPageProps {
  complaints: Complaint[];
  isLoading: boolean;
}

export type StatusFilter = "all" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";

export type SeverityScoreFilter = "all" | "0-3.9" | "4.0-5.9" | "6.0-7.9" | "8.0+";

export type ComplaintStatusFilter = "all" | "submitted" | "resolved" | "forwarded_to_lgu" | "forwarded_to_department" | "resolved_by_department" | "resolved_by_barangay" | "reviewed_by_department" | "reviewed_by_barangay" | "reviewed_by_lgu" | "resolved_by_lgu";

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
  { label: "Moderate", value: "MODERATE" },
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

export const COMPLAINT_STATUS_FILTERS: { label: string; value: ComplaintStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Resolved by Barangay", value: "resolved_by_barangay" },
  { label: "Resolved by LGU", value: "resolved_by_lgu" },
  { label: "Resolved by Department", value: "resolved_by_department" },
  { label: "Forwarded to LGU", value: "forwarded_to_lgu" },
  { label: "Forwarded to Department", value: "forwarded_to_department" },
  { label: "Reviewed by Department", value: "reviewed_by_department" },
  { label: "Reviewed by Barangay", value: "reviewed_by_barangay" },
  { label: "Reviewed by LGU", value: "reviewed_by_lgu" },
  { label: "Resolved by LGU", value: "resolved_by_lgu" },
];

export const ITEMS_PER_PAGE = 8;