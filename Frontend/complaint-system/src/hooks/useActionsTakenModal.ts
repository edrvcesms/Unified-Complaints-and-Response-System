import { useState, useCallback } from "react";

interface ActionsTakenModalState {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText: string;
  confirmColor: "red" | "green" | "yellow" | "blue";
  onConfirm: (actionsTaken: string) => void;
  isLoading: boolean;
}

export function useActionsTakenModal() {
  const [state, setState] = useState<ActionsTakenModalState>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    confirmColor: "green",
    onConfirm: () => {},
    isLoading: false,
  });

  const openModal = useCallback(
    ({
      title,
      confirmText,
      confirmColor = "green",
      onConfirm,
      description,
    }: {
      title: string;
      confirmText: string;
      confirmColor?: "red" | "green" | "yellow" | "blue";
      onConfirm: (actionsTaken: string) => void;
      description?: string;
    }) => {
      setState((prev) => ({
        ...prev,
        isOpen: true,
        title,
        confirmText,
        confirmColor,
        onConfirm,
        description,
      }));
    },
    []
  );

  const closeModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      isLoading: false,
    }));
  }, []);

  const setIsLoading = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading: value,
    }));
  }, []);

  return {
    isOpen: state.isOpen,
    title: state.title,
    confirmText: state.confirmText,
    confirmColor: state.confirmColor,
    isLoading: state.isLoading,
    description: state.description,

    setIsLoading,
    openModal,
    closeModal,
    onConfirm: state.onConfirm, // ✅ unchanged API
  };
}