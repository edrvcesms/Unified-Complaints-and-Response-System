import type{ Attachment } from "./attachment";

export interface ComplaintLetterPreviewProps {
  barangayName: string;
  title: string;
  message: string;
  attachments?: Attachment[];
}