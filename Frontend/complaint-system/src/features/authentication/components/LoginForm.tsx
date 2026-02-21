import { AlertBanner } from "./AlertBanner";
import { ErrorMessage } from "./ErrorMessage";
import { PasswordInput } from "./PasswordInputs";
import { SubmitButton } from "./SubmitButton";
import type { LoginRequestData, LoginFormErrors } from "../../../types/auth/login";

// ─── Component: LoginForm ─────────────────────────────────────────────────────
// The login card — purely presentational. All state and handlers come from props
// (fed by the useLoginForm hook in LoginPage).

interface LoginFormProps {
  formData: LoginRequestData;
  errors: LoginFormErrors;
  showPassword: boolean;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  onTogglePassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  formData,
  errors,
  showPassword,
  isLoading,
  onChange,
  onSubmit,
  onForgotPassword,
  onTogglePassword,
}) => (
  <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">

    {/* Heading */}
    <div className="space-y-1">
      <h3 className="text-2xl font-bold text-gray-800">Barangay Login</h3>
      <p className="text-sm text-gray-500">Sign in with your official barangay credentials.</p>
    </div>

    {/* Server / auth error banner */}
    {errors.general && <AlertBanner message={errors.general} />}

    <form onSubmit={onSubmit} noValidate className="space-y-5">

      {/* ── Email / Username ── */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
          Username or Email
        </label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          value={formData.email}
          onChange={onChange}
          placeholder="e.g. brgy.official@sta-maria.gov.ph"
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={!!errors.email}
          className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 transition
            ${errors.email
              ? "border-red-400 bg-red-50 focus:ring-red-300"
              : "border-gray-300 bg-white focus:ring-blue-400 focus:border-blue-400"
            }`}
        />
        {errors.email && <ErrorMessage id="email-error" message={errors.email} />}
      </div>

      {/* ── Password ── */}
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          value={formData.password}
          showPassword={showPassword}
          hasError={!!errors.password}
          onChange={onChange}
          onToggle={onTogglePassword}
        />
        {errors.password && <ErrorMessage id="password-error" message={errors.password} />}
      </div>

      {/* ── Remember Me + Forgot Password ── */}
      <div className="flex items-center justify-end gap-4">

        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline transition cursor-pointer"
        >
          Forgot Password?
        </button>
      </div>

      {/* ── Submit ── */}
      <SubmitButton isLoading={isLoading} />
    </form>

    {/* Compliance note */}
    <p className="text-center text-xs text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
      For account issues, contact your Municipal IT Officer.<br />
      Unauthorized access is a violation of RA 10175.
    </p>
  </div>
);