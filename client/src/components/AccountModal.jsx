import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { errorMessage } from "../format.js";
import Modal from "./Modal.jsx";

export default function AccountModal({ account, onClose, onSaved }) {
  const isEditing = Boolean(account);
  const [form, setForm] = useState({
    ownerName: account?.ownerName || "",
    email: account?.email || "",
    accountType: account?.accountType || "checking",
    status: account?.status || "active",
    initialBalance: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (isEditing) {
        const response = await api.updateAccount(account.id, {
          ownerName: form.ownerName,
          email: form.email,
          accountType: form.accountType,
          status: form.status,
        });
        await onSaved(`${response.data.ownerName}'s account was updated.`);
      } else {
        const response = await api.createAccount({
          ownerName: form.ownerName,
          email: form.email,
          accountType: form.accountType,
          initialBalance: form.initialBalance || "0",
        });
        await onSaved(`Account ${response.data.accountNumber} created.`);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit account" : "Open an account"}
      subtitle={
        isEditing
          ? `${account.accountNumber} · balances only change through transactions`
          : "Create an account, then deposit or transfer funds."
      }
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Owner name</span>
          <input
            type="text"
            value={form.ownerName}
            onChange={update("ownerName")}
            placeholder="Ada Lovelace"
            minLength={2}
            maxLength={80}
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="ada@example.com"
            required
          />
        </label>

        <div className="form-grid">
          <label className="field">
            <span>Account type</span>
            <select value={form.accountType} onChange={update("accountType")}>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </label>

          {isEditing ? (
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={update("status")}>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Opening balance</span>
              <div className="amount-field">
                <span className="amount-prefix">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.initialBalance}
                  onChange={update("initialBalance")}
                  placeholder="0.00"
                />
              </div>
            </label>
          )}
        </div>

        {isEditing ? (
          <div className="form-note">
            To change the balance, use a deposit, withdrawal, or transfer. The
            account number is permanent.
          </div>
        ) : null}

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="modal-actions">
          <button
            className="button button-ghost"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={saving}
          >
            {saving ? <Loader2 size={17} className="spin" /> : null}
            {isEditing ? "Save changes" : "Create account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
