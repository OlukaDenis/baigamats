import { create } from 'zustand';

export type ModalType = 'confirmation' | 'success' | 'error' | 'warning' | 'info';

export interface ShowModalOptions {
  type?: ModalType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'destructive' | 'success';
  isDestructive?: boolean;
  dismissible?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface AppModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: 'primary' | 'destructive' | 'success';
  isDestructive: boolean;
  dismissible: boolean;
  isLoading: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;

  showModal: (options: ShowModalOptions) => void;
  hideModal: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAppModalStore = create<AppModalState>((set, get) => ({
  isOpen: false,
  type: 'info',
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmVariant: 'primary',
  isDestructive: false,
  dismissible: true,
  isLoading: false,

  showModal: (options: ShowModalOptions) => {
    set({
      isOpen: true,
      type: options.type ?? 'info',
      title: options.title,
      message: options.message ?? '',
      confirmText: options.confirmText ?? (options.type === 'confirmation' ? 'Confirm' : 'Got it'),
      cancelText: options.cancelText ?? 'Cancel',
      confirmVariant: options.confirmVariant ?? (options.isDestructive ? 'destructive' : 'primary'),
      isDestructive: options.isDestructive ?? false,
      dismissible: options.dismissible ?? options.type !== 'confirmation',
      isLoading: false,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  },

  hideModal: () => {
    const { onCancel } = get();
    set({ isOpen: false, isLoading: false });
    onCancel?.();
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

/**
 * Imperative helper for displaying themed bottom sheet dialogs anywhere.
 */
export const appModal = {
  show: (options: ShowModalOptions) => useAppModalStore.getState().showModal(options),
  hide: () => useAppModalStore.getState().hideModal(),

  confirm: (options: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }) => {
    useAppModalStore.getState().showModal({
      ...options,
      type: 'confirmation',
      confirmVariant: options.isDestructive ? 'destructive' : 'primary',
    });
  },

  success: (title: string, message?: string, onDismiss?: () => void) => {
    useAppModalStore.getState().showModal({
      type: 'success',
      title,
      message,
      confirmText: 'Done',
      confirmVariant: 'success',
      dismissible: true,
      onConfirm: onDismiss,
    });
  },

  error: (title: string, message?: string, onDismiss?: () => void) => {
    useAppModalStore.getState().showModal({
      type: 'error',
      title,
      message,
      confirmText: 'Dismiss',
      confirmVariant: 'destructive',
      dismissible: true,
      onConfirm: onDismiss,
    });
  },

  warning: (title: string, message?: string, onDismiss?: () => void) => {
    useAppModalStore.getState().showModal({
      type: 'warning',
      title,
      message,
      confirmText: 'Understood',
      confirmVariant: 'primary',
      dismissible: true,
      onConfirm: onDismiss,
    });
  },

  info: (title: string, message?: string, onDismiss?: () => void) => {
    useAppModalStore.getState().showModal({
      type: 'info',
      title,
      message,
      confirmText: 'Got it',
      confirmVariant: 'primary',
      dismissible: true,
      onConfirm: onDismiss,
    });
  },
};

/**
 * React hook to access modal helpers inside components.
 */
export function useAppModal() {
  return appModal;
}
