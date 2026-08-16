import type { UserData } from "../general/user";

export interface ResponseAttachmentData {
  id: number;
  response_id: number;
  file_url: string;
  media_type: string;
}

export interface ResponseData {
  id: number;
  incident_id: number;
  responder_id: number;
  actions_taken: string;
  response_date: Date;
  user?: UserData;
  response_attachments?: ResponseAttachmentData[] | null;
}