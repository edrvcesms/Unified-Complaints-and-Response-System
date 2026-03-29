import React from "react";
import { useTranslation } from "react-i18next";

const LoadingIndicator: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary-600"></div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-slate-400 tracking-wide">{t('common.pleaseWait')}</span>
      </div>
    </div>
  );
};

export default LoadingIndicator;