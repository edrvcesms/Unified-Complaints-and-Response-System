const MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024;

export const validateAttachments = (attachments: File[]): string | null => {
  const totalSize = attachments.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_ATTACHMENT_SIZE_BYTES) {
    return `Files are too large (${(totalSize / 1024 / 1024).toFixed(1)} MB). Maximum is 100 MB total.`;
  }
  return null;
};