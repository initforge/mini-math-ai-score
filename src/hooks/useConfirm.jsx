import { useState } from 'react';
import ConfirmModal from '../components/common/ConfirmModal';

export function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: 'Xác nhận',
    message: '',
    onConfirm: null,
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    variant: 'danger'
  });

  const confirm = (options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Xác nhận',
        message: options.message || '',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy',
        variant: options.variant || 'danger',
        onConfirm: () => {
          resolve(true);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });
  };

  const close = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmDialog = () => (
    <ConfirmModal
      isOpen={confirmState.isOpen}
      onClose={close}
      onConfirm={confirmState.onConfirm || (() => {})}
      title={confirmState.title}
      message={confirmState.message}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      variant={confirmState.variant}
    />
  );

  return { confirm, ConfirmDialog };
}

