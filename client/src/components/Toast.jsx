import { AlertCircle, CheckCircle2, X } from "lucide-react";

export default function Toast({ toast, onClose }) {
  if (!toast) {
    return null;
  }

  const Icon = toast.type === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      className={`toast toast-${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <Icon size={20} />
      <span>{toast.message}</span>
      <button
        className="toast-close"
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}
