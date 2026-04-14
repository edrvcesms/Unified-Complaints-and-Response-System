import { useTranslation } from 'react-i18next';
import StaMariaLogo from "../../../assets/StaMariaLogo.jpg";
import municipal_hall from "../../../assets/municipal_hall.jpg";

export const BrandingPanel: React.FC = () => {
  const { t } = useTranslation();
  
  return (
  <div
    className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
    style={{
      backgroundImage: `url(${municipal_hall})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
  >
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

    <div className="relative z-10 flex flex-col items-center text-center px-12 space-y-6">
      <div className="w-56 h-56 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
        <img
          src={StaMariaLogo}
          alt="Bayan ng Santa Maria, Laguna Seal"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-white space-y-2">
        <p className="text-xs uppercase tracking-widest font-semibold text-white-200">
          {t('appInfo.country')}
        </p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight drop-shadow">
          {t('appInfo.municipality')}
        </h1>
        <h2 className="text-xl font-semibold text-white-200">
          {t('appInfo.systemName')}
        </h2>
        <div className="w-40 h-1 bg-white mx-auto rounded-full mt-3" />
      </div>

      <p className="text-primary-50 text-s leading-relaxed max-w-xs">
        {t('appInfo.systemDescription')}
      </p>
    </div>
  </div>
  );
};