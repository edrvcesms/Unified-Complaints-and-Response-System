import type { Complaint } from "./complaint";
export interface ComplaintCluster {
  id: number;
  complaint_id: number;
  incident_id: number;
  similarity_score: number;
  linked_at: Date;
  complaint: Complaint;
}