import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { errorMessage, formatMoney } from "../format.js";
import Modal from "./Modal.jsx";

export default function ConfirmDelete({ account, onClose, onDeleted }) {
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const hasBalance = Number(account.balance) > 0;

  const handleDelete = async () => {
    setError("");
    setDeleting(true);

    try {
      await api.deleteAccount(account.id);
      await onDeleted(`${account.ownerName}'s account was deleted.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title="Delete account"
      subtitle={`${account.ownerName} · ${account.accountNumber}`}
      onClose={onClose}
      size="small"
    >
      <div className="delete-body">
        <div className="delete-icon">
          <AlertTriangle size={24} />
        </div>

        {hasBalance ? (
          <>
            <p>
              This account still holds{" "}
              <strong>{formatMoney(account.balance)}</strong>. Transfer the
              remaining balance before deleting it.
            </p>
            <div className="form-note">
              This guard keeps the ledger consistent and prevents funds from
              disappearing.
            </div>
          </>
        ) : (
          <>
            <p>
              This permanently removes the account. Its historical transaction
              entries remain in the audit trail.
            </p>
            <div className="form-note">
              Only zero-balance accounts can be deleted.
            </div>
          </>
        )}

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}
      </div>

      <div className="modal-actions">
        <button
          className="button button-ghost"
          type="button"
          onClick={onClose}
          disabled={deleting}
        >
          {hasBalance ? "Close" : "Cancel"}
        </button>
        {hasBalance ? null : (
          <button
            className="button button-danger"
            type="button"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Delete account
          </button>
        )}
      </div>
    </Modal>
  );
}
