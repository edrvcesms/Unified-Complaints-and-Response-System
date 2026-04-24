import { useTranslation } from 'react-i18next';
import { BrandingPanel } from "../components/BrandingPanel";
import { LoginForm } from "../components/LoginForm";
import { MobileHeader } from "../components/Mobileheader";
import { useSuperAdminLoginForm } from "../../../hooks/useSuperAdminLoginForm";
import { LanguageSwitcher } from "../../general/LanguageSwitcher";

export const SuperAdminLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    formData,
    errors,
    showPassword,
    isLoading,
    turnstileRenderKey,
    handleChange,
    handleSubmit,
    handleForgotPassword,
    togglePasswordVisibility,
    handleTurnstileToken,
  } = useSuperAdminLoginForm();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <BrandingPanel />

      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:px-16">
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
          title={t('auth.superAdminLogin')}
          subtitle={t('auth.superAdminLoginInstruction')}
          onTurnstileToken={handleTurnstileToken}
          turnstileRenderKey={turnstileRenderKey}
        />

        <p className="mt-6 text-xs text-gray-400 text-center">
          {t('footer.copyright')}
        </p>
      </div>
    </div>
  );
};

export default SuperAdminLoginPage;
