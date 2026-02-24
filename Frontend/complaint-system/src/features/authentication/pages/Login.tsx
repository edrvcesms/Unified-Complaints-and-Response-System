import { useTranslation } from 'react-i18next';
import { BrandingPanel } from "../components/BrandingPanel";
import { LoginForm } from "../components/LoginForm";
import { MobileHeader } from "../components/Mobileheader";
import { useLoginForm } from "../../../hooks/useLoginForm";
import { LanguageSwitcher } from "../../general/LanguageSwitcher";


// ─── Page: LoginPage ──────────────────────────────────────────────────────────
// Root page component. Composes BrandingPanel + LoginForm and wires everything
// together via the useLoginForm hook. Contains no business logic itself.

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    formData,
    errors,
    showPassword,
    isLoading,
    handleChange,
    handleSubmit,
    handleForgotPassword,
    togglePasswordVisibility,
  } = useLoginForm();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Left — government branding (desktop only) */}
      <BrandingPanel />


      {/* Right — login form panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:px-16">
        {/* Compact branding shown only on mobile */}
        <MobileHeader />

        <LoginForm
          formData={formData}
          errors={errors}
          showPassword={showPassword}
          isLoading={isLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onForgotPassword={handleForgotPassword}
          onTogglePassword={togglePasswordVisibility}
        />

        {/* Page footer */}
        <p className="mt-6 text-xs text-gray-400 text-center">
          {t('footer.copyright')}
        </p>
      </div>
    </div>
  );
};

