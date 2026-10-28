import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  ReceiptText,
} from "lucide-react";
import { formatDate, formatMoney, typeLabel } from "../format.js";

const typeIcons = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  transfer: ArrowLeftRight,
};

const accountName = (account) => account?.ownerName || "Deleted account";

export default function TransactionsPanel({ transactions, loading }) {
  return (
    <section
      className="panel transactions-panel"
      aria-labelledby="transactions-title"
    >
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">Audit trail</p>
          <h2 id="transactions-title">Recent activity</h2>
        </div>
        <span className="record-count">
          {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="panel-loading">
          <Loader2 size={20} className="spin" />
          Loading transactions
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <ReceiptText size={28} strokeWidth={1.5} />
          <h3>No transactions yet</h3>
          <p>Deposits, withdrawals, and transfers will appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Flow</th>
                <th>Date</th>
                <th className="align-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const Icon = typeIcons[transaction.type] || ReceiptText;
                const isTransfer = transaction.type === "transfer";

                return (
                  <tr key={transaction.id}>
                    <td>
                      <span className={`type-badge type-${transaction.type}`}>
                        <Icon size={14} />
                        {typeLabel(transaction.type)}
                      </span>
                    </td>
                    <td>
                      <div className="flow">
                        {transaction.type === "deposit" ? (
                          <>
                            <span className="flow-muted">From external</span>
                            <ArrowRight size={13} />
                            <strong>{accountName(transaction.toAccount)}</strong>
                          </>
                        ) : transaction.type === "withdrawal" ? (
                          <>
                            <strong>{accountName(transaction.fromAccount)}</strong>
                            <ArrowRight size={13} />
                            <span className="flow-muted">External</span>
                          </>
                        ) : (
                          <>
                            <strong>{accountName(transaction.fromAccount)}</strong>
                            <ArrowRight size={13} />
                            <strong>{accountName(transaction.toAccount)}</strong>
                          </>
                        )}
                      </div>
                      {transaction.description ? (
                        <span className="flow-note">
                          {transaction.description}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span className="date-cell">
                        {formatDate(transaction.createdAt)}
                      </span>
                      <span className="reference-cell">
                        {transaction.reference}
                      </span>
                    </td>
                    <td className="align-right">
                      <span
                        className={`transaction-amount ${
                          transaction.type === "deposit"
                            ? "amount-positive"
                            : transaction.type === "withdrawal"
                              ? "amount-negative"
                              : isTransfer
                                ? "amount-transfer"
                                : ""
                        }`}
                      >
                        {transaction.type === "deposit"
                          ? "+"
                          : transaction.type === "withdrawal"
                            ? "−"
                            : ""}
                        {formatMoney(transaction.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
