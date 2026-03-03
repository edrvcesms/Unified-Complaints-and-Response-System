import { useTranslation } from 'react-i18next';
import StaMariaLogo from "../../../assets/StaMariaLogo.jpg";;

export const BrandingPanel: React.FC = () => {
  const { t } = useTranslation();
  
  return (
  <div
    className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
    style={{ background: "linear-gradient(160deg, #003087 0%, #0055b3 60%, #0077cc 100%)" }}
  >

    <div className="relative z-10 flex flex-col items-center text-center px-12 space-y-6">
      <div className="w-56 h-56 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
        <img
          src={StaMariaLogo}
          alt="Bayan ng Santa Maria, Laguna Seal"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-white space-y-2">
        <p className="text-xs uppercase tracking-widest font-semibold text-blue-200">
          {t('appInfo.country')}
        </p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight drop-shadow">
          {t('appInfo.municipality')}
        </h1>
        <h2 className="text-xl font-semibold text-blue-100">
          {t('appInfo.systemName')}
        </h2>
        <div className="w-16 h-1 bg-white mx-auto rounded-full mt-3" />
      </div>

      <p className="text-blue-200 text-sm leading-relaxed max-w-xs">
        {t('appInfo.systemDescription')}
      </p>
    </div>
  </div>
  );
};