import StaMariaLogo from "../../../assets/StaMariaLogo.jpg";
import { useTranslation } from "react-i18next";

export const MobileHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex lg:hidden flex-col items-center text-center mb-8 space-y-3">
      <div className="w-20 h-20 rounded-full border-4 border-primary-700 shadow-lg overflow-hidden bg-white">
        <img src={StaMariaLogo} alt="Sta. Maria, Laguna Seal" className="w-full h-full object-cover" />
      </div>
      <div>
        <h1 className="text-xl font-extrabold text-primary-800">{t("appInfo.municipality")}</h1>
        <p className="text-sm text-gray-500 font-medium">{t("appInfo.systemName")}</p>
      </div>
    </div>
  );
};