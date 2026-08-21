import { useState, useCallback } from 'react';
import type { DialogButton } from '@/components/Dialog';

interface UseDialogOptions {
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Hook for delete/warning dialogs
 */
export function useDeleteDialog(options?: UseDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Confirm Deletion',
    description: 'Are you sure you want to delete this item? This action cannot be undone.',
    itemName: '',
  });

  const open = useCallback((itemName: string = '', description?: string) => {
    setConfig({
      title: 'Confirm Deletion',
      description: description || `Are you sure you want to delete "${itemName}"? This action cannot be undone and the data will be permanently removed from our servers.`,
      itemName,
    });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const buttons: DialogButton[] = [
    {
      label: 'Cancel',
      onClick: () => {
        options?.onCancel?.();
      },
      variant: 'secondary',
    },
    {
      label: 'Delete',
      onClick: () => {
        options?.onConfirm?.();
      },
      variant: 'danger',
    },
  ];

  return { isOpen, open, close, config, buttons };
}

/**
 * Hook for success/confirmation dialogs
 */
export function useSuccessDialog(options?: UseDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Success',
    description: 'Operation completed successfully.',
  });

  const open = useCallback((title: string = 'Success', description: string = 'Operation completed successfully.') => {
    setConfig({ title, description });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const buttons: DialogButton[] = [
    {
      label: 'OK',
      onClick: () => {
        options?.onConfirm?.();
      },
      variant: 'primary',
    },
  ];

  return { isOpen, open, close, config, buttons };
}

/**
 * Hook for warning dialogs
 */
export function useWarningDialog(options?: UseDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Warning',
    description: 'Please be careful with this action.',
  });

  const open = useCallback((title: string = 'Warning', description: string = 'Please be careful with this action.') => {
    setConfig({ title, description });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const buttons: DialogButton[] = [
    {
      label: 'Cancel',
      onClick: () => {
        options?.onCancel?.();
      },
      variant: 'secondary',
    },
    {
      label: 'Continue',
      onClick: () => {
        options?.onConfirm?.();
      },
      variant: 'primary',
    },
  ];

  return { isOpen, open, close, config, buttons };
}

/**
 * Hook for info dialogs
 */
export function useInfoDialog(options?: UseDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Information',
    description: 'Here is some information for you.',
  });

  const open = useCallback((title: string = 'Information', description: string = 'Here is some information for you.') => {
    setConfig({ title, description });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const buttons: DialogButton[] = [
    {
      label: 'OK',
      onClick: () => {
        options?.onConfirm?.();
      },
      variant: 'primary',
    },
  ];

  return { isOpen, open, close, config, buttons };
}
