import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api.js";
import {
  accountOptionLabel,
  errorMessage,
  formatMoney,
} from "../format.js";

const modes = [
  {
    value: "deposit",
    label: "Deposit",
    icon: ArrowDownLeft,
    submit: "Deposit funds",
  },
  {
    value: "withdraw",
    label: "Withdraw",
    icon: ArrowUpRight,
    submit: "Withdraw funds",
  },
  {
    value: "transfer",
    label: "Transfer",
    icon: ArrowLeftRight,
    submit: "Send transfer",
  },
];

export default function MoneyPanel({ accounts, request, onComplete }) {
  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === "active"),
    [accounts],
  );

  const pickPrimary = (preferred) => {
    if (preferred && activeAccounts.some((account) => account.id === preferred)) {
      return preferred;
    }
    return activeAccounts[0]?.id || "";
  };

  const [mode, setMode] = useState(request.mode || "transfer");
  const [primaryId, setPrimaryId] = useState(() =>
    pickPrimary(request.accountId),
  );
  const [destinationId, setDestinationId] = useState(() => {
    const primary = pickPrimary(request.accountId);
    return activeAccounts.find((account) => account.id !== primary)?.id || "";
  });
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeAccounts.length === 0) {
      if (primaryId) {
        setPrimaryId("");
      }
      if (destinationId) {
        setDestinationId("");
      }
      return;
    }

    const nextPrimary = activeAccounts.some(
      (account) => account.id === primaryId,
    )
      ? primaryId
      : activeAccounts.some((account) => account.id === request.accountId)
        ? request.accountId
        : activeAccounts[0].id;

    if (nextPrimary !== primaryId) {
      setPrimaryId(nextPrimary);
    }
  }, [activeAccounts, primaryId, request.accountId]);

  useEffect(() => {
    if (activeAccounts.length === 0) {
      return;
    }

    const destinationIsValid =
      destinationId &&
      destinationId !== primaryId &&
      activeAccounts.some((account) => account.id === destinationId);

    if (!destinationIsValid) {
      const nextDestination =
        activeAccounts.find((account) => account.id !== primaryId)?.id || "";

      if (nextDestination !== destinationId) {
        setDestinationId(nextDestination);
      }
    }
  }, [activeAccounts, destinationId, primaryId]);

  const primaryAccount = activeAccounts.find(
    (account) => account.id === primaryId,
  );
  const destinationAccount = activeAccounts.find(
    (account) => account.id === destinationId,
  );
  const selectedMode = modes.find((item) => item.value === mode);
  const ModeIcon = selectedMode.icon;
  const needsSecondAccount = mode === "transfer";
  const hasEnoughAccounts = needsSecondAccount
    ? activeAccounts.length >= 2
    : activeAccounts.length >= 1;

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setAmount("");
    setDescription("");
    setError("");
  };

  const handlePrimaryChange = (event) => {
    const nextId = event.target.value;
    setPrimaryId(nextId);
    setError("");

    if (nextId === destinationId) {
      setDestinationId(
        activeAccounts.find((account) => account.id !== nextId)?.id || "",
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!primaryId || (needsSecondAccount && !destinationId)) {
      setError("Choose the accounts for this transaction.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = { amount, description };

      if (mode === "deposit") {
        await api.deposit(primaryId, payload);
      } else if (mode === "withdraw") {
        await api.withdraw(primaryId, payload);
      } else {
        await api.transfer({
          ...payload,
          fromAccountId: primaryId,
          toAccountId: destinationId,
        });
      }

      const message =
        mode === "deposit"
          ? `Deposited ${formatMoney(numericAmount)} into ${primaryAccount.ownerName}'s account.`
          : mode === "withdraw"
            ? `Withdrew ${formatMoney(numericAmount)} from ${primaryAccount.ownerName}'s account.`
            : `Transferred ${formatMoney(numericAmount)} from ${primaryAccount.ownerName} to ${destinationAccount.ownerName}.`;

      setAmount("");
      setDescription("");
      await onComplete(message);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel money-panel" aria-labelledby="money-title">
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Secure operations</p>
          <h2 id="money-title">Move money</h2>
        </div>
        <span className="lock-badge">
          <LockKeyhole size={14} />
          ACID
        </span>
      </div>

      <div className="tabs" role="tablist" aria-label="Transaction type">
        {modes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={mode === item.value}
              className={`tab${mode === item.value ? " tab-active" : ""}`}
              onClick={() => changeMode(item.value)}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {!hasEnoughAccounts ? (
        <div className="money-unavailable">
          <ShieldCheck size={24} strokeWidth={1.5} />
          <h3>
            {activeAccounts.length === 0
              ? "No active accounts"
              : "One more account needed"}
          </h3>
          <p>
            {activeAccounts.length === 0
              ? "Open an account or unfreeze an existing one to move money."
              : "Transfers need two active accounts. You can still make a deposit or withdrawal."}
          </p>
          {activeAccounts.length > 0 && mode === "transfer" ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => changeMode("deposit")}
            >
              Make a deposit instead
            </button>
          ) : null}
        </div>
      ) : (
        <form className="money-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{mode === "deposit" ? "To account" : "From account"}</span>
            <select
              value={primaryId}
              onChange={handlePrimaryChange}
              required
            >
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {accountOptionLabel(account)}
                </option>
              ))}
            </select>
          </label>

          {primaryAccount ? (
            <div className="available-line">
              <span>Available balance</span>
              <strong>{formatMoney(primaryAccount.balance)}</strong>
            </div>
          ) : null}

          {needsSecondAccount ? (
            <label className="field">
              <span>To account</span>
              <select
                value={destinationId}
                onChange={(event) => {
                  setDestinationId(event.target.value);
                  setError("");
                }}
                required
              >
                {activeAccounts
                  .filter((account) => account.id !== primaryId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {accountOptionLabel(account)}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}

          <label className="field">
            <span>Amount</span>
            <div className="amount-field">
              <span className="amount-prefix">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
              />
              {mode !== "deposit" && primaryAccount?.balance > 0 ? (
                <button
                  className="max-button"
                  type="button"
                  onClick={() => setAmount(String(primaryAccount.balance))}
                >
                  Max
                </button>
              ) : null}
            </div>
          </label>

          <label className="field">
            <span>Note <small>optional</small></span>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={180}
              placeholder="What is this for?"
            />
          </label>

          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}

          <button
            className="button button-primary button-wide"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={17} className="spin" />
                Processing
              </>
            ) : (
              <>
                <ModeIcon size={17} />
                {selectedMode.submit}
              </>
            )}
          </button>

          <p className="transaction-note">
            <ShieldCheck size={15} />
            Wrapped in a MongoDB session with snapshot reads and journaled
            majority writes.
          </p>
        </form>
      )}
    </section>
  );
}
