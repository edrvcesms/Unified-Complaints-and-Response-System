export interface Event {
  id: number;
  event_name: string;
  description: string | null;
  date: Date;
  location: string | null;
  media: EventMedia[];
}

export interface EventMedia{
  id: number;
  event_id: number;
  media_url: string;
  media_type: string;
  uploaded_at: Date;
}