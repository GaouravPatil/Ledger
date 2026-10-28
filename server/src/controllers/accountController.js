import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import { getDbStatus } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateAccountNumber,
  generateTransactionReference,
} from "../utils/identifiers.js";
import { moneyToCents } from "../utils/money.js";
import { escapeRegex } from "../utils/text.js";
import { runInTransaction } from "../utils/transaction.js";

export const listAccounts = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    if (!["active", "frozen"].includes(req.query.status)) {
      throw new ApiError(400, "Status must be active or frozen.");
    }
    filter.status = req.query.status;
  }

  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [
      { ownerName: pattern },
      { email: pattern },
      { accountNumber: pattern },
    ];
  }

  const accounts = await Account.find(filter).sort({ createdAt: -1 });

  res.json({ data: accounts });
});

export const getAccount = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id);

  if (!account) {
    throw new ApiError(404, "Account not found.");
  }

  res.json({ data: account });
});

export const createAccount = asyncHandler(async (req, res) => {
  const {
    ownerName,
    email,
    accountType = "checking",
    currency = "USD",
    initialBalance = 0,
  } = req.body;

  const initialCents = moneyToCents(initialBalance, {
    field: "Initial balance",
    allowZero: true,
  });

  const accountData = {
    ownerName,
    email,
    accountType,
    currency,
    accountNumber: generateAccountNumber(),
    balanceCents: initialCents,
  };

  let account;

  if (initialCents === 0) {
    account = await Account.create(accountData);
  } else {
    account = await runInTransaction(async (session) => {
      const [created] = await Account.create([accountData], { session });

      await Transaction.create(
        [
          {
            reference: generateTransactionReference(),
            type: "deposit",
            toAccount: created._id,
            amountCents: initialCents,
            description: "Opening deposit",
          },
        ],
        { session },
      );

      return created;
    });
  }

  res.status(201).json({ data: account });
});

export const updateAccount = asyncHandler(async (req, res) => {
  const forbiddenFields = ["balance", "balanceCents", "accountNumber"].filter(
    (field) => Object.hasOwn(req.body, field),
  );

  if (forbiddenFields.length > 0) {
    throw new ApiError(
      400,
      "Balance and account number cannot be changed here. Use a deposit, withdrawal, or transfer to move money.",
    );
  }

  const account = await Account.findById(req.params.id);

  if (!account) {
    throw new ApiError(404, "Account not found.");
  }

  const editableFields = ["ownerName", "email", "accountType", "status"];

  for (const field of editableFields) {
    if (Object.hasOwn(req.body, field)) {
      account[field] = req.body[field];
    }
  }

  await account.save();

  res.json({ data: account });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const account = await Account.findOneAndDelete({
    _id: req.params.id,
    balanceCents: 0,
  });

  if (!account) {
    const existing = await Account.findById(req.params.id);

    if (!existing) {
      throw new ApiError(404, "Account not found.");
    }

    throw new ApiError(
      409,
      "Only accounts with a zero balance can be deleted. Move the remaining funds first.",
    );
  }

  res.json({
    data: { id: req.params.id },
    message: "Account deleted.",
  });
});

export const getStats = asyncHandler(async (_req, res) => {
  const [accountStats] = await Account.aggregate([
    {
      $group: {
        _id: null,
        totalBalanceCents: { $sum: "$balanceCents" },
        totalAccounts: { $sum: 1 },
        activeAccounts: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
      },
    },
  ]);

  const [transactionStats] = await Transaction.aggregate([
    {
      $group: {
        _id: null,
        transactionCount: { $sum: 1 },
        volumeCents: { $sum: "$amountCents" },
      },
    },
  ]);

  res.json({
    data: {
      totalBalance: (accountStats?.totalBalanceCents || 0) / 100,
      totalAccounts: accountStats?.totalAccounts || 0,
      activeAccounts: accountStats?.activeAccounts || 0,
      transactionCount: transactionStats?.transactionCount || 0,
      volume: (transactionStats?.volumeCents || 0) / 100,
      transactionsEnabled: getDbStatus().transactionSupport,
    },
  });
});
