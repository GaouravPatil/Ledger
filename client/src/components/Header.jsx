import { Landmark, RefreshCw } from "lucide-react";

const statusFor = (health) => {
  if (!health) {
    return { label: "Connecting", tone: "neutral" };
  }

  if (health.database?.transactionSupport) {
    return { label: "Replica set live", tone: "online" };
  }

  if (health.database?.connected) {
    return { label: "Transactions off", tone: "warning" };
  }

  return { label: "API offline", tone: "offline" };
};

export default function Header({ health, loading, onRefresh }) {
  const status = statusFor(health);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="/" aria-label="Acid Ledger home">
          <span className="brand-mark">
            <Landmark size={21} strokeWidth={1.8} />
          </span>
          <span className="brand-copy">
            <strong>Acid Ledger</strong>
            <small>Transactional banking</small>
          </span>
        </a>

        <div className="topbar-actions">
          <span className={`status-chip status-${status.tone}`}>
            <span className="status-dot" />
            {status.label}
          </span>
          <button
            className="icon-button refresh-button"
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh data"
            title="Refresh data"
          >
            <RefreshCw size={17} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>
    </header>
  );
}
