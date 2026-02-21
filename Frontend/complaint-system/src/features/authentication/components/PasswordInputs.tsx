interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  showPassword: boolean;
  hasError: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  name,
  value,
  showPassword,
  hasError,
  onChange,
  onToggle,
}) => (
  <div className="relative">
    <input
      id={id}
      name={name}
      type={showPassword ? "text" : "password"}
      autoComplete="current-password"
      value={value}
      onChange={onChange}
      placeholder="Enter your password"
      aria-describedby={hasError ? `${id}-error` : undefined}
      aria-invalid={hasError}
      className={`w-full px-4 py-2.5 pr-11 rounded-lg border text-sm text-gray-800 placeholder-gray-400
        focus:outline-none focus:ring-2 transition
        ${hasError
          ? "border-red-400 bg-red-50 focus:ring-red-300"
          : "border-gray-300 bg-white focus:ring-blue-400 focus:border-blue-400"
        }`}
    />
    <button
      type="button"
      onClick={onToggle}
      aria-label={showPassword ? "Hide password" : "Show password"}
      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition"
    >
      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  </div>
);