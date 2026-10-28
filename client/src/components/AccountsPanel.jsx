import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { formatMoney, initials } from "../format.js";

export default function AccountsPanel({
  accounts,
  loading,
  onNew,
  onEdit,
  onDelete,
  onQuickAction,
}) {
  const [search, setSearch] = useState("");

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return accounts;
    }

    return accounts.filter((account) =>
      [account.ownerName, account.email, account.accountNumber].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [accounts, search]);

  const activeCount = accounts.filter(
    (account) => account.status === "active",
  ).length;

  return (
    <section className="panel accounts-panel" aria-labelledby="accounts-title">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Directory</p>
          <h2 id="accounts-title">Accounts</h2>
        </div>
        <button className="button button-primary" type="button" onClick={onNew}>
          <Plus size={17} />
          New account
        </button>
      </div>

      <div className="accounts-toolbar">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or number"
            aria-label="Search accounts"
          />
        </label>
        <span className="record-count">
          {filteredAccounts.length} of {accounts.length}
        </span>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="panel-loading">
          <Loader2 size={20} className="spin" />
          Loading accounts
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="empty-state">
          {accounts.length === 0 ? (
            <Landmark size={28} strokeWidth={1.5} />
          ) : (
            <Search size={28} strokeWidth={1.5} />
          )}
          <h3>{accounts.length === 0 ? "No accounts yet" : "No matches"}</h3>
          <p>
            {accounts.length === 0
              ? "Open the first account to begin moving money."
              : "Try a different name, email, or account number."}
          </p>
          {accounts.length === 0 ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={onNew}
            >
              <Plus size={16} />
              Open an account
            </button>
          ) : null}
        </div>
      ) : (
        <div className="account-list">
          {filteredAccounts.map((account) => {
            const frozen = account.status !== "active";
            const transferDisabled = frozen || activeCount < 2;

            return (
              <article className="account-row" key={account.id}>
                <div className="account-avatar" aria-hidden="true">
                  {initials(account.ownerName)}
                </div>

                <div className="account-identity">
                  <div className="account-name-line">
                    <h3>{account.ownerName}</h3>
                    <span className={`badge badge-${account.status}`}>
                      {account.status}
                    </span>
                  </div>
                  <p>{account.email}</p>
                  <div className="account-meta">
                    <span>{account.accountNumber}</span>
                    <span>{account.accountType}</span>
                  </div>
                </div>

                <div className="account-balance">
                  <span>Balance</span>
                  <strong>{formatMoney(account.balance)}</strong>
                </div>

                <div className="account-row-actions">
                  <div className="quick-actions">
                    <button
                      className="quick-action"
                      type="button"
                      onClick={() => onQuickAction(account, "deposit")}
                      disabled={frozen}
                      title={
                        frozen ? "Frozen accounts cannot move money" : "Deposit"
                      }
                    >
                      <ArrowDownLeft size={14} />
                      Deposit
                    </button>
                    <button
                      className="quick-action"
                      type="button"
                      onClick={() => onQuickAction(account, "withdraw")}
                      disabled={frozen}
                      title={
                        frozen ? "Frozen accounts cannot move money" : "Withdraw"
                      }
                    >
                      <ArrowUpRight size={14} />
                      Withdraw
                    </button>
                    <button
                      className="quick-action"
                      type="button"
                      onClick={() => onQuickAction(account, "transfer")}
                      disabled={transferDisabled}
                      title={
                        frozen
                          ? "Frozen accounts cannot move money"
                          : activeCount < 2
                            ? "Open a second active account to transfer"
                            : "Transfer"
                      }
                    >
                      <ArrowLeftRight size={14} />
                      Transfer
                    </button>
                  </div>

                  <div className="edit-actions">
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => onEdit(account)}
                      aria-label={`Edit ${account.ownerName}`}
                      title="Edit account"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button icon-button-danger"
                      type="button"
                      onClick={() => onDelete(account)}
                      aria-label={`Delete ${account.ownerName}`}
                      title="Delete account"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
