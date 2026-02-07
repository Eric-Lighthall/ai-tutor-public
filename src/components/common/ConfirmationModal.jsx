// generic confirm/cancel dialog  - used for reset progress, etc.
import React from 'react';
import Button from './Button';

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmButtonVariant = "danger",
}) {
    if (!isOpen) {
        return null;
    }


    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/70 animate-fade-in-fast"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-modal-title"
        >
            <div
                className="bg-neutral-800 shadow-xl rounded-lg p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-out animate-slide-up-fast"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirmation-modal-title" className="text-xl font-semibold text-neutral-100 mb-4">
                    {title}
                </h2>
                <p className="text-neutral-300 mb-6">
                    {message}
                </p>
                <div className="flex justify-end space-x-3">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        aria-label={cancelText}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant={confirmButtonVariant === 'primary' ? 'primary' : confirmButtonVariant === 'danger' ? 'danger' : 'secondary'}
                        aria-label={confirmText}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
