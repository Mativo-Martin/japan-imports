import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-xl border ${toast.type === 'success'
                ? 'bg-white/95 border-stone-200 text-stone-900 shadow-stone-300/40'
                : toast.type === 'warning'
                  ? 'bg-white/95 border-amber-300 text-stone-900 shadow-amber-200/40'
                  : 'bg-white/95 border-stone-200 text-stone-900 shadow-stone-300/40'
              }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#000000]" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-stone-700" />}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-bold text-stone-900 font-display">{toast.title}</p>
              {toast.message && <p className="text-xs text-stone-600 mt-0.5">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-lg hover:bg-stone-100"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

