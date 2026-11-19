import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white border border-zinc-200 rounded-md w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            {variant === 'danger' && (
              <AlertTriangle className="w-5 h-5 text-[#be123c] shrink-0" />
            )}
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold font-display text-zinc-900"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5257]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-5">
          <p className="text-sm text-zinc-600 leading-relaxed">{description}</p>
        </div>

        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-[#be123c] hover:bg-[#9f1239]'
                : 'bg-[#0f5257] hover:bg-[#0a3c40]'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
