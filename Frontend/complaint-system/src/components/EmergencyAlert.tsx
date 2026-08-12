import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { formatTimeAgo } from '../utils/dateUtils';
import { getSeverityColor } from '../utils/incidentHelpers';

export interface EmergencyAlertProps {
  items: {
    id: number | string;
    title: string;
    severityLevel: string;
    reportedAt: string | Date;
  }[];
  onViewAll: () => void;
  onDismissAll: () => void;
}

const MAX_VISIBLE_ITEMS = 5;

export const EmergencyAlert: React.FC<EmergencyAlertProps> = ({ items, onViewAll, onDismissAll }) => {
  const { t } = useTranslation();
  const count = items.length;
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = count - visibleItems.length;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/35 px-4">
      <div className="absolute inset-0 bg-black/35" onClick={onDismissAll} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="emergency-alert-title"
        className="relative w-full max-w-[480px] rounded-xl border border-gray-200 bg-white"
      >
        <div className="p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>

            <div className="min-w-0">
              <p id="emergency-alert-title" className="text-sm font-medium tracking-wide text-red-600">
                {count} {count === 1 ? 'emergency' : 'emergencies'}
              </p>
              <p className="text-xs text-gray-400">Unresolved</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatTimeAgo(item.reportedAt)}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${getSeverityColor(item.severityLevel)}`}
                >
                  {item.severityLevel.replace(/_/g, ' ')}
                </span>
              </div>
            ))}

            {remainingCount > 0 && (
              <button
                onClick={onViewAll}
                className="w-full rounded-lg border border-dashed border-gray-200 py-2 text-center text-xs font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
              >
                +{remainingCount} more
              </button>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={onViewAll}
              className="flex-1 min-h-9 rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-700"
            >
              View all
            </button>
            <button
              onClick={onDismissAll}
              className="flex-1 min-h-9 rounded-lg border border-gray-300 bg-white px-5 text-sm text-gray-600 transition hover:bg-gray-50"
              aria-label={t('frontend.a11y.closeNotification')}
            >
              Dismiss all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};