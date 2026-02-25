import { useState, useCallback } from 'react';

interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'red' | 'green' | 'yellow' | 'blue';
  onConfirm: () => void | Promise<void>;
  isLoading: boolean;
}

export const useConfirmationModal = () => {
  const [modalState, setModalState] = useState<ConfirmationModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmColor: 'blue',
    onConfirm: () => {},
    isLoading: false,
  });

  const openModal = useCallback(
    (config: Omit<ConfirmationModalState, 'isOpen' | 'isLoading'>) => {
      setModalState({
        isOpen: true,
        isLoading: false,
        ...config,
      });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
  }, []);

  const confirm = useCallback(async () => {
    setModalState((prev) => ({ ...prev, isLoading: true }));
    try {
      await modalState.onConfirm();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setModalState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [modalState.onConfirm]);

  return {
    isOpen: modalState.isOpen,
    title: modalState.title,
    message: modalState.message,
    confirmText: modalState.confirmText,
    confirmColor: modalState.confirmColor,
    isLoading: modalState.isLoading,
    openModal,
    closeModal,
    confirm,
  };
};
