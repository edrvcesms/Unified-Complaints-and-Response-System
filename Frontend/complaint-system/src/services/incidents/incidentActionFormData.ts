const MAX_UPLOAD_FILES = 3;

export const buildIncidentActionFormData = (
  actionsTaken: string,
  attachments?: File[]
): FormData => {
  const formData = new FormData();
  formData.append("response_data", JSON.stringify({ actions_taken: actionsTaken }));
  formData.append("actions_taken", actionsTaken);

  if (attachments?.length) {
    attachments.slice(0, MAX_UPLOAD_FILES).forEach((file) => formData.append("attachments", file));
  }

  return formData;
};
