import mongoose from "mongoose";
import { getDbStatus } from "../config/db.js";
import { ApiError } from "./ApiError.js";

const TRANSACTION_OPTIONS = {
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority", j: true },
};

export const assertTransactionsSupported = () => {
  if (!getDbStatus().transactionSupport) {
    throw new ApiError(
      503,
      "MongoDB transactions require a replica set. Start the project replica set with `npm run mongo:start` or `docker compose up -d`.",
    );
  }
};

export const runInTransaction = async (work) => {
  assertTransactionsSupported();

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      result = await work(session);
    }, TRANSACTION_OPTIONS);

    return result;
  } finally {
    await session.endSession();
  }
};
