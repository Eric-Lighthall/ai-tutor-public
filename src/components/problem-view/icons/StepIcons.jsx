import React from 'react';
import { LockClosedIcon, ChatBubbleLeftRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ChevronRight } from 'lucide-react';

export const LockIcon = ({ className = "h-4 w-4 text-neutral-500" }) => (
  <LockClosedIcon className={className} />
);

export const ChevronIcon = ({ collapsed, className = "h-5 w-5" }) => (
  <ChevronRight 
    className={`${className} transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
  />
);

export const ResetIcon = ({ className = "h-4 w-4" }) => (
  <ArrowPathIcon className={className} />
);

export const ChatIcon = ({ className = "h-6 w-6" }) => (
  <ChatBubbleLeftRightIcon className={className} />
);