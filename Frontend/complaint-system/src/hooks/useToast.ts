import { useState, useCallback } from 'react';
import type { ToastProps } from '../components/Toast';

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback(
    (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
      const id = `toast-${++toastId}`;
      const newToast: ToastProps = {
        ...toast,
        id,
        onClose: (toastId: string) => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        },
      };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  return { toasts, showToast };
};
