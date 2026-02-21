interface ErrorMessageProps {
  id: string;
  message: string;
}

const AlertCircle = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-7-4a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 8a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
  </svg>
);

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ id, message }) => (
  <p id={id} role="alert" className="text-xs text-red-600 flex items-center gap-1">
    <AlertCircle />
    {message}
  </p>
);