import mongoose from "mongoose";

const DEFAULT_URI =
  "mongodb://127.0.0.1:27018/acid_ledger?replicaSet=rs0";

let transactionSupport = false;
let topology = "unknown";

export const connectDB = async (uri = process.env.MONGODB_URI || DEFAULT_URI) => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });

  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  topology = hello.setName
    ? `replicaSet:${hello.setName}`
    : hello.msg === "isdbgrid"
      ? "shardedCluster"
      : "standalone";

  transactionSupport = Boolean(hello.setName || hello.msg === "isdbgrid");

  if (!transactionSupport) {
    console.warn(
      "MongoDB is running as a standalone server. ACID transactions require a replica set. Run `npm run mongo:start` or `docker compose up -d`.",
    );
  }

  console.log(
    `MongoDB connected to ${mongoose.connection.host}/${mongoose.connection.name} (${topology})`,
  );

  return mongoose.connection;
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  transactionSupport = false;
  topology = "unknown";
};

export const getDbStatus = () => ({
  readyState: mongoose.connection.readyState,
  connected: mongoose.connection.readyState === 1,
  transactionSupport,
  topology,
});
