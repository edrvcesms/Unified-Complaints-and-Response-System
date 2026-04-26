export interface Notification {
  id: number;
  title: string;
  message: string;
  sent_at: Date;
  is_read: boolean;
  notification_type: string;
  channel: string;
  user_id: number;
  incident_id?: number;
  complaint_id?: number;
}