import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'warning' | 'info';

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastNotificationProps {
  toast: ToastState | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function ToastNotification({
  toast,
  onDismiss,
  durationMs = 4200,
}: ToastNotificationProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, durationMs, onDismiss]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] pointer-events-none flex justify-end"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.01 }
                : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
            }
            className={`pointer-events-auto max-w-md w-full sm:w-auto px-4 py-3 rounded-xl shadow-lg backdrop-blur-md border flex items-start gap-3 text-sm ${
              toast.tone === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                : toast.tone === 'warning'
                ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                : 'bg-white/95 border-stone-300 text-zinc-900'
            }`}
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : toast.tone === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-[#A6192E] shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
            )}
            <p className="flex-1 text-xs sm:text-sm leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="p-0.5 -mr-1 opacity-70 hover:opacity-100 rounded transition-opacity shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
