const MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024;

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
]);

const ALLOWED_ATTACHMENT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".mov",
  ".avi",
  ".wmv",
];

const isAllowedAttachmentType = (file: File) => {
  if (ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return true;
  }

  const fileName = file.name.toLowerCase();
  return ALLOWED_ATTACHMENT_EXTENSIONS.some((extension) => fileName.endsWith(extension));
};

export const validateAttachments = (attachments: File[]): string | null => {
  const invalidFiles = attachments.filter((file) => !isAllowedAttachmentType(file));
  if (invalidFiles.length > 0) {
    return `Unsupported file type: ${invalidFiles[0].name}. Please upload JPG, JPEG, PNG, MP4, MPEG, MOV, AVI, or WMV files only.`;
  }

  const totalSize = attachments.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_ATTACHMENT_SIZE_BYTES) {
    return `Files are too large (${(totalSize / 1024 / 1024).toFixed(1)} MB). Maximum is 100 MB total.`;
  }
  return null;
};