import { FeedbacksPage } from "../../general/FeedbacksPage";

export const DepartmentFeedbacks: React.FC = () => {
  return (
    <FeedbacksPage
      title="Feedbacks"
      description="Browse feedback submitted for incidents resolved in the department dashboard."
      detailPathBase="/department/incidents"
      emptyMessage="No feedbacks found for resolved incidents."
    />
  );
};

export default DepartmentFeedbacks;