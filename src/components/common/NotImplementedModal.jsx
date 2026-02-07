// modal shown when clicking a problem that isn't implemented yet
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Button from './Button';

const NotImplementedModal = ({ isOpen, onClose, problemTitle }) => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    onClose();
    navigate('/problems/two-sum');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700 w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-300 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-amber-900/30 rounded-full">
          <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-neutral-100 mb-2">
            Problem Not Available Yet
          </h3>
          <p className="text-sm text-neutral-400 mb-6">
            <span className="font-medium">{problemTitle}</span> has not been implemented yet.
            Try the fully implemented Two Sum problem to get started.
          </p>

          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={onClose}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRedirect}
              className="min-w-[120px]"
            >
              Try Two Sum
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotImplementedModal;
