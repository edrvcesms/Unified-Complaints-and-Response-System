import type { UserData } from "../general/user";
export interface ResponseData {
  id: number;
  incident_id: number;
  responder_id: number;
  actions_taken: string;
  response_date: Date;
  user?: UserData;
}