import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, Info, AlertCircle, AlertTriangle } from 'lucide-react';

export interface ToastProps {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  type = 'info',
  duration = 5000,
  onClose,
}) => {
  const { t } = useTranslation();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-800',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-800',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-800',
    },
    info: {
      icon: Info,
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      iconColor: 'text-primary-600',
      textColor: 'text-primary-800',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4 max-w-md w-full
        ${isExiting ? 'animate-slideOut' : 'animate-slideIn'}`}
      role="alert"
    >
      <div className="flex gap-3">
        <Icon className={`${config.iconColor} w-5 h-5 shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${config.textColor}`}>{title}</p>
          <p className={`text-sm ${config.textColor} mt-1`}>{message}</p>
        </div>
        <button
          onClick={handleClose}
          className={`${config.iconColor} hover:opacity-70 transition shrink-0`}
          aria-label={t('frontend.a11y.closeNotification')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastProps[] }> = ({ toasts }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
          pointer-events: auto;
        }

        .animate-slideOut {
          animation: slideOut 0.3s ease-in;
        }
      `}</style>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export interface EmergencyAlertProps {
  title: string;
  message: string;
  onView: () => void;
  onClose: () => void;
}

export const EmergencyAlert: React.FC<EmergencyAlertProps> = ({ title, message, onView, onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="emergency-alert-title"
        aria-describedby="emergency-alert-message"
        className="relative w-full max-w-2xl rounded-3xl border-2 border-red-300 bg-white shadow-[0_30px_100px_rgba(127,29,29,0.45)]"
      >
        <div className="p-6 sm:p-8 md:p-10 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-inner shadow-red-200">
            <AlertTriangle className="h-10 w-10 animate-pulse" />
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-red-600">Emergency</p>
          <h2 id="emergency-alert-title" className="text-3xl font-extrabold text-gray-900 sm:text-5xl">
            {title}
          </h2>
          <p id="emergency-alert-message" className="mx-auto mt-4 max-w-xl text-lg leading-8 text-gray-700 sm:text-2xl">
            {message}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={onView}
              className="inline-flex min-w-36 items-center justify-center rounded-full bg-red-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-red-700"
            >
              View
            </button>
            <button
              onClick={onClose}
              className="inline-flex min-w-36 items-center justify-center rounded-full border border-red-200 bg-white px-8 py-3 text-base font-semibold text-red-700 transition hover:bg-red-50"
              aria-label={t('frontend.a11y.closeNotification')}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
