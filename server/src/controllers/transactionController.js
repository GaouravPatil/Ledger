import mongoose from "mongoose";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTransactionReference } from "../utils/identifiers.js";
import { moneyToCents } from "../utils/money.js";
import { cleanDescription } from "../utils/text.js";
import { runInTransaction } from "../utils/transaction.js";

const requireObjectId = (value, field) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `${field} must be a valid account id.`);
  }
};

const findAccountForError = async (id, session) =>
  Account.findById(id).session(session);

const activeAccountError = async (id, session) => {
  const account = await findAccountForError(id, session);

  if (!account) {
    return new ApiError(404, "Account not found.");
  }

  return new ApiError(409, "Account is frozen and cannot move money.");
};

export const deposit = asyncHandler(async (req, res) => {
  requireObjectId(req.params.accountId, "Account");
  const amountCents = moneyToCents(req.body.amount);
  const description = cleanDescription(req.body.description);

  const result = await runInTransaction(async (session) => {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.accountId, status: "active" },
      { $inc: { balanceCents: amountCents } },
      { new: true, session },
    );

    if (!account) {
      throw await activeAccountError(req.params.accountId, session);
    }

    const [transaction] = await Transaction.create(
      [
        {
          reference: generateTransactionReference(),
          type: "deposit",
          toAccount: account._id,
          amountCents,
          description,
        },
      ],
      { session },
    );

    return { account, transaction };
  });

  res.status(201).json({ data: result });
});

export const withdraw = asyncHandler(async (req, res) => {
  requireObjectId(req.params.accountId, "Account");
  const amountCents = moneyToCents(req.body.amount);
  const description = cleanDescription(req.body.description);

  const result = await runInTransaction(async (session) => {
    const account = await Account.findOneAndUpdate(
      {
        _id: req.params.accountId,
        status: "active",
        balanceCents: { $gte: amountCents },
      },
      { $inc: { balanceCents: -amountCents } },
      { new: true, session },
    );

    if (!account) {
      const existing = await findAccountForError(
        req.params.accountId,
        session,
      );

      if (!existing) {
        throw new ApiError(404, "Account not found.");
      }

      if (existing.status !== "active") {
        throw new ApiError(409, "Account is frozen and cannot move money.");
      }

      throw new ApiError(409, "Insufficient funds for this withdrawal.");
    }

    const [transaction] = await Transaction.create(
      [
        {
          reference: generateTransactionReference(),
          type: "withdrawal",
          fromAccount: account._id,
          amountCents,
          description,
        },
      ],
      { session },
    );

    return { account, transaction };
  });

  res.status(201).json({ data: result });
});

export const transfer = asyncHandler(async (req, res) => {
  const { fromAccountId, toAccountId } = req.body;
  requireObjectId(fromAccountId, "From account");
  requireObjectId(toAccountId, "To account");

  if (String(fromAccountId) === String(toAccountId)) {
    throw new ApiError(400, "Source and destination accounts must differ.");
  }

  const amountCents = moneyToCents(req.body.amount);
  const description = cleanDescription(req.body.description);

  const result = await runInTransaction(async (session) => {
    const fromAccount = await Account.findOneAndUpdate(
      {
        _id: fromAccountId,
        status: "active",
        balanceCents: { $gte: amountCents },
      },
      { $inc: { balanceCents: -amountCents } },
      { new: true, session },
    );

    if (!fromAccount) {
      const existing = await findAccountForError(fromAccountId, session);

      if (!existing) {
        throw new ApiError(404, "Source account not found.");
      }

      if (existing.status !== "active") {
        throw new ApiError(409, "Source account is frozen.");
      }

      throw new ApiError(409, "Insufficient funds for this transfer.");
    }

    const toAccount = await Account.findOneAndUpdate(
      { _id: toAccountId, status: "active" },
      { $inc: { balanceCents: amountCents } },
      { new: true, session },
    );

    if (!toAccount) {
      throw await activeAccountError(toAccountId, session);
    }

    const [transaction] = await Transaction.create(
      [
        {
          reference: generateTransactionReference(),
          type: "transfer",
          fromAccount: fromAccount._id,
          toAccount: toAccount._id,
          amountCents,
          description,
        },
      ],
      { session },
    );

    return { fromAccount, toAccount, transaction };
  });

  res.status(201).json({ data: result });
});

export const listTransactions = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.accountId) {
    requireObjectId(req.query.accountId, "Account");
    filter.$or = [
      { fromAccount: req.query.accountId },
      { toAccount: req.query.accountId },
    ];
  }

  if (req.query.type) {
    if (!["deposit", "withdrawal", "transfer"].includes(req.query.type)) {
      throw new ApiError(
        400,
        "Transaction type must be deposit, withdrawal, or transfer.",
      );
    }
    filter.type = req.query.type;
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 50;

  const transactions = await Transaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("fromAccount", "ownerName email accountNumber balanceCents")
    .populate("toAccount", "ownerName email accountNumber balanceCents");

  res.json({ data: transactions });
});
