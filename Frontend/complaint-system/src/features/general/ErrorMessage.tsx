interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
      {message}
    </div>
  );
};
