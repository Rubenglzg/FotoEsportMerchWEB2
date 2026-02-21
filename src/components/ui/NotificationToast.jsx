import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

export function NotificationToast({ notification }) {
  if (!notification) return null;

  return (
    <div className={`fixed top-20 right-4 z-[200] px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 transition-all animate-fade-in-down ${notification.type === 'error' ? 'bg-red-500' : 'bg-gray-800'}`}>
      {notification.type === 'success' && <Check className="w-5 h-5 text-emerald-400" />}
      {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-white" />}
      <span className="font-medium">{notification.msg}</span>
    </div>
  );
}