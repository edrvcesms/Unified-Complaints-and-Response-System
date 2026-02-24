import type { Category } from "../general/category";
import type { BarangayData } from "../barangay/barangayAccount";
import type { ComplaintCluster } from "./complaintCluster";

export interface Incident {
  id: number;
  title: string;
  description: string;
  barangay_id: number;
  category_id: number;
  department_id: number;
  severity_level: string;
  status: string;
  complaint_count: number;
  severity_score: number;
  first_reported_at: Date;
  last_reported_at: Date;
  category: Category;
  barangay: BarangayData;
  complaint_clusters: ComplaintCluster[];
}