export interface FeedbackPerCategory {
  category_id: number;
  category_name: string;
  total_feedbacks: number;
  average_rating: number;
  total_resolved: number;
  total_rate: number;
}

export interface CategoryFeedbackRates {
  total_resolved: number;
  total_rate: number;
  average_rate: number;
  by_category: FeedbackPerCategory[];
}
