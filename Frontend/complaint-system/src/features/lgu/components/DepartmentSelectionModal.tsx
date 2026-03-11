import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Department } from '../../../types/department/department';
import { X } from 'lucide-react';

interface DepartmentSelectionModalProps {
  isOpen: boolean;
  departments: Department[];
  onSelect: (departmentAccountId: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DepartmentSelectionModal: React.FC<DepartmentSelectionModalProps> = ({
  isOpen,
  departments,
  onSelect,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedDepartmentId !== null) {
      onSelect(selectedDepartmentId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('modal.selectDept.title')}</h3>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          {t('modal.selectDept.description')}
        </p>
        
        <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
          {departments.map((department) => (
            <label
              key={department.id}
              className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedDepartmentId === department.department_account?.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="department"
                value={department.department_account?.id}
                checked={selectedDepartmentId === department.department_account?.id}
                onChange={() => setSelectedDepartmentId(department.department_account?.id || null)}
                disabled={isLoading}
                className="mt-1 mr-3 cursor-pointer"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{department.department_name}</p>
                {department.description && (
                  <p className="text-sm text-gray-500 mt-1">{department.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
        
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('modal.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || selectedDepartmentId === null}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {isLoading ? t('modal.processing') : t('modal.select')}
          </button>
        </div>
      </div>
    </div>
  );
};
