interface SubmitButtonProps {
  isLoading: boolean;
}

const Spinner = () => (
  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

export const SubmitButton: React.FC<SubmitButtonProps> = ({ isLoading }) => (
  <button
    type="submit"
    disabled={isLoading}
    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
      text-white font-semibold text-sm tracking-wide shadow-md transition duration-200 cursor-pointer
      ${isLoading
        ? "bg-blue-400 cursor-not-allowed"
        : "bg-blue-700 hover:bg-blue-800 active:scale-[0.98]"
      }`}
  >
    {isLoading && <Spinner />}
    {isLoading ? "Signing in…" : "Login"}
  </button>
);