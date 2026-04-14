import { useTranslation } from 'react-i18next';
import { AlertBanner } from "./AlertBanner";
import { ErrorMessage } from "./ErrorMessage";
import { PasswordInput } from "./PasswordInputs";
import { SubmitButton } from "./SubmitButton";
import type { LoginRequestData, LoginFormErrors } from "../../../types/auth/login";

interface LoginFormProps {
  formData: LoginRequestData;
  errors: LoginFormErrors;
  showPassword: boolean;
  isLoading: boolean;
  title?: string;
  subtitle?: string;
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
  title,
  subtitle,
  onChange,
  onSubmit,
  onForgotPassword,
  onTogglePassword,
}) => {
  const { t } = useTranslation();
  const titleText = title ?? t('auth.officialLogin');
  const subtitleText = subtitle ?? t('auth.signinInstruction');
  
  return (
  <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-10 space-y-6">
    <div className="space-y-2">
      <h3 className="text-3xl font-bold text-gray-800">{titleText}</h3>
      <p className="text-base text-gray-500">{subtitleText}</p>
    </div>

    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-base font-semibold text-gray-700">
          {t('auth.usernameOrEmail')}
        </label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          value={formData.email}
          onChange={onChange}
          placeholder={t('auth.usernamePlaceholder')}
          maxLength={255}
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={!!errors.email}
          className={`w-full px-4 py-3 rounded-lg border text-base text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 transition
            ${errors.email
              ? "border-red-400 bg-red-50 focus:ring-red-300"
              : "border-primary-300 bg-white focus:ring-primary-500 focus:border-green-400"
            }`}
        />
        {errors.email && <ErrorMessage id="email-error" message={errors.email} />}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-base font-semibold text-gray-700">
          {t('auth.password')}
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

      <div className="flex items-center justify-end gap-4">

        <button
          type="button"
          onClick={onForgotPassword}
          className="text-base font-medium text-primary-700 hover:text-primary-900 hover:underline transition cursor-pointer"
        >
          {t('auth.forgotPassword')}
        </button>
      </div>

      <SubmitButton isLoading={isLoading} />
    </form>

    {errors.general && <AlertBanner message={errors.general} />}

    <p className="text-center text-sm text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
      {t('auth.contactInfo')}<br />
      {t('auth.unauthorizedAccess')}
    </p>
  </div>
  );
};