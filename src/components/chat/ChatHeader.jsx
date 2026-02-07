// header bar for the floating chat panel - title, clear, close buttons
import React from 'react';
import { FiMessageCircle, FiTrash2, FiX } from 'react-icons/fi';

export default function ChatHeader({ onClose, onClearChat }) {
  return (
    <div className="p-4 border-b flex justify-between items-center h-14 flex-shrink-0 border-neutral-700">
      <div className="flex items-center space-x-2">
        <FiMessageCircle className="h-6 w-6 text-blue-500" />
        <h3 className="text-lg font-semibold text-white">
          AI Assistant
        </h3>
      </div>
      <div className="flex items-center space-x-1">
        <button
          title="Clear chat"
          onClick={onClearChat}
          className="p-1 cursor-pointer text-neutral-400 hover:text-white"
        >
          <FiTrash2 className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          className="p-1 cursor-pointer text-neutral-400 hover:text-white"
        >
          <FiX className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
