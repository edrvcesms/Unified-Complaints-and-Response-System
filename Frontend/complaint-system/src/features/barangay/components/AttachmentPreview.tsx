interface Attachment {
  url: string;
  name?: string;
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
}

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
const isVideo = (url: string) => /\.(mp4|mov|webm|avi)$/i.test(url);

const FileIcon = () => (
  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Attachments ({attachments.length})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {attachments.map((file, idx) => {
          const name = file.name ?? `Attachment ${idx + 1}`;

          if (isImage(file.url)) {
            return (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block rounded-xl overflow-hidden border border-gray-100
                  shadow-sm hover:shadow-md transition aspect-video bg-gray-50"
                aria-label={`View image: ${name}`}
              >
                <img
                  src={file.url}
                  alt={name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex
                  items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition bg-white/90
                    text-gray-800 text-[10px] font-semibold px-2 py-1 rounded-full">
                    View
                  </span>
                </div>
              </a>
            );
          }

          if (isVideo(file.url)) {
            return (
              <div key={idx} className="rounded-xl overflow-hidden border border-gray-100 shadow-sm aspect-video bg-black">
                <video
                  src={file.url}
                  controls
                  className="w-full h-full object-contain"
                  aria-label={name}
                />
              </div>
            );
          }

          return (
            <a
              key={idx}
              href={file.url}
              download={name}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100
                bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition group"
              aria-label={`Download file: ${name}`}
            >
              <FileIcon />
              <span className="text-xs text-gray-600 group-hover:text-blue-700 truncate font-medium">
                {name}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};