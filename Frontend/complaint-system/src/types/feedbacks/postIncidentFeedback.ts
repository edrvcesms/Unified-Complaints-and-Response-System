export interface PostIncidentFeedbackUser {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export interface PostIncidentFeedbackIncident {
  id: number;
  title: string | null;
  description: string | null;
  resolver_id: number | null;
}

export interface PostIncidentFeedback {
  id: number;
  incident_id: number;
  ratings: number;
  message: string | null;
  created_at: string;
  user: PostIncidentFeedbackUser;
  incident: PostIncidentFeedbackIncident;
}