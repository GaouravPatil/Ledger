import "dotenv/config";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import Account from "./models/Account.js";
import Transaction from "./models/Transaction.js";

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  try {
    await connectDB();
    await Promise.all([Account.init(), Transaction.init()]);

    const server = app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start API:", error.message);
    process.exit(1);
  }
};

start();
