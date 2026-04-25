import { FeedbacksPage } from "../../general/FeedbacksPage";

export const LguFeedbacks: React.FC = () => {
  return (
    <FeedbacksPage
      title="Feedbacks"
      description="Browse feedback submitted for incidents resolved in the LGU dashboard."
      detailPathBase="/lgu/incidents"
      emptyMessage="No feedbacks found for resolved incidents."
    />
  );
};

export default LguFeedbacks;