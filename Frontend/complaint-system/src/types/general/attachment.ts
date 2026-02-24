export interface Attachment {
  id: string;
  uri: string;
  type: 'image' | 'video' | 'file';
  name: string;
  mimeType?: string;
  size?: number;
}
