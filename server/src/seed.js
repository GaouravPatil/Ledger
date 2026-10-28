import "dotenv/config";
import Account from "./models/Account.js";
import Transaction from "./models/Transaction.js";
import { connectDB, disconnectDB } from "./config/db.js";
import {
  generateAccountNumber,
  generateTransactionReference,
} from "./utils/identifiers.js";
import { runInTransaction } from "./utils/transaction.js";

const demoAccounts = [
  {
    ownerName: "Alice Morgan",
    email: "alice@example.com",
    accountType: "checking",
    balanceCents: 842050,
  },
  {
    ownerName: "Bob Chen",
    email: "bob@example.com",
    accountType: "savings",
    balanceCents: 517525,
  },
  {
    ownerName: "Carol Diaz",
    email: "carol@example.com",
    accountType: "checking",
    balanceCents: 234000,
  },
];

const seed = async () => {
  try {
    await connectDB();
    await Promise.all([Account.init(), Transaction.init()]);

    await runInTransaction(async (session) => {
      await Transaction.deleteMany({}, { session });
      await Account.deleteMany({}, { session });

      const accounts = await Account.create(
        demoAccounts.map((account) => ({
          ...account,
          accountNumber: generateAccountNumber(),
          currency: "USD",
        })),
        { session, ordered: true },
      );

      await Transaction.create(
        accounts.map((account) => ({
          reference: generateTransactionReference(),
          type: "deposit",
          toAccount: account._id,
          amountCents: account.balanceCents,
          description: "Opening deposit",
        })),
        { session, ordered: true },
      );

      console.log(`Seeded ${accounts.length} accounts:`);
      for (const account of accounts) {
        console.log(
          `  ${account.ownerName} | ${account.accountNumber} | $${(account.balanceCents / 100).toFixed(2)}`,
        );
      }
    });

    console.log("Seed complete.");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

seed();
