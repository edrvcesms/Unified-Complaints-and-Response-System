export interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: Date;
  complaint_id: number;
  uploaded_by: number;
}