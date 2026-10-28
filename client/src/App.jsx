import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "./api.js";
import AccountModal from "./components/AccountModal.jsx";
import AccountsPanel from "./components/AccountsPanel.jsx";
import ConfirmDelete from "./components/ConfirmDelete.jsx";
import Header from "./components/Header.jsx";
import MoneyPanel from "./components/MoneyPanel.jsx";
import StatCard from "./components/StatCard.jsx";
import Toast from "./components/Toast.jsx";
import TransactionsPanel from "./components/TransactionsPanel.jsx";
import {
  errorMessage,
  formatCompactMoney,
  formatMoney,
} from "./format.js";

const acidProperties = ["Atomicity", "Consistency", "Isolation", "Durability"];

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [accountModal, setAccountModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moneyRequest, setMoneyRequest] = useState({
    mode: "transfer",
    accountId: "",
    key: 0,
  });
  const moneyPanelRef = useRef(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const [healthResponse, statsResponse, accountsResponse, transactionsResponse] =
        await Promise.all([
          api.health(),
          api.stats(),
          api.listAccounts(),
          api.listTransactions(),
        ]);

      setHealth(healthResponse);
      setStats(statsResponse.data);
      setAccounts(accountsResponse.data);
      setTransactions(transactionsResponse.data);
    } catch (requestError) {
      setHealth({
        status: "offline",
        database: { connected: false, transactionSupport: false },
      });
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (moneyRequest.key > 0) {
      moneyPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [moneyRequest.key]);

  const notify = (message, type = "success") =>
    setToast({ message, type, id: Date.now() });

  const handleQuickAction = (account, mode) => {
    setMoneyRequest((current) => ({
      mode,
      accountId: account.id,
      key: current.key + 1,
    }));
  };

  const handleAccountSaved = async (message) => {
    setAccountModal(null);
    notify(message);
    await loadData({ silent: true });
  };

  const handleAccountDeleted = async (message) => {
    setDeleteTarget(null);
    notify(message);
    await loadData({ silent: true });
  };

  const handleMoneyComplete = async (message) => {
    notify(message);
    await loadData({ silent: true });
  };

  const transactionsEnabled = health?.database?.transactionSupport;

  return (
    <div className="app">
      <Header
        health={health}
        loading={loading}
        onRefresh={() => loadData()}
      />

      <main className="main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">MERN · MongoDB transactions</p>
            <h1>
              Every dollar,
              <br />
              <em>accounted for.</em>
            </h1>
            <p className="hero-description">
              A transactional ledger for accounts and money movement. Each
              balance change commits as one all-or-nothing operation.
            </p>
          </div>

          <aside
            className={`guarantee-card${
              transactionsEnabled ? "" : " guarantee-card-warning"
            }`}
          >
            <div className="guarantee-heading">
              <span className="guarantee-icon">
                <ShieldCheck size={21} />
              </span>
              <div>
                <strong>
                  {transactionsEnabled
                    ? "Replica-set protected"
                    : "Replica set required"}
                </strong>
                <span>
                  {transactionsEnabled
                    ? "Snapshot reads. Journaled majority writes."
                    : "Start MongoDB as a replica set to enable transfers."}
                </span>
              </div>
            </div>
            <div className="acid-chips">
              {acidProperties.map((property) => (
                <span key={property}>{property}</span>
              ))}
            </div>
          </aside>
        </section>

        {error ? (
          <div className="error-banner" role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Could not reach the ledger</strong>
              <span>{error}</span>
            </div>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => loadData()}
            >
              Retry
            </button>
          </div>
        ) : null}

        <section className="stats-grid" aria-label="Ledger overview">
          <StatCard
            icon={Wallet}
            label="Ledger balance"
            value={formatMoney(stats?.totalBalance)}
            detail={`${stats?.activeAccounts ?? 0} active accounts`}
            accent
            loading={loading && !stats}
          />
          <StatCard
            icon={Users}
            label="Accounts"
            value={stats?.totalAccounts ?? 0}
            detail="Open in the ledger"
            loading={loading && !stats}
          />
          <StatCard
            icon={Activity}
            label="Transactions"
            value={stats?.transactionCount ?? 0}
            detail="Settled entries"
            loading={loading && !stats}
          />
          <StatCard
            icon={ArrowLeftRight}
            label="Processed volume"
            value={formatCompactMoney(stats?.volume)}
            detail="Across all transaction types"
            loading={loading && !stats}
          />
        </section>

        <div className="workspace-grid">
          <AccountsPanel
            accounts={accounts}
            loading={loading}
            onNew={() => setAccountModal({ account: null })}
            onEdit={(account) => setAccountModal({ account })}
            onDelete={setDeleteTarget}
            onQuickAction={handleQuickAction}
          />

          <div ref={moneyPanelRef}>
            <MoneyPanel
              key={moneyRequest.key}
              accounts={accounts}
              request={moneyRequest}
              onComplete={handleMoneyComplete}
            />
          </div>
        </div>

        <TransactionsPanel
          transactions={transactions}
          loading={loading}
        />
      </main>

      <footer className="footer">
        <span>Acid Ledger · MERN stack demonstration</span>
        <span>Account CRUD + transactional money movement</span>
      </footer>

      {accountModal ? (
        <AccountModal
          account={accountModal.account}
          onClose={() => setAccountModal(null)}
          onSaved={handleAccountSaved}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDelete
          account={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleAccountDeleted}
        />
      ) : null}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
