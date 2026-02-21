import React from 'react';
import Modal from './Modal';

/**
 * ConfirmDialog — destructive action confirmation modal
 */
export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message || 'Are you sure you want to proceed?'}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary text-sm">
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={danger ? 'btn-danger text-sm' : 'btn-primary text-sm'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
