import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { startRecurringTransactionWorker } from "./jobs/recurringTransaction.worker.js";

const start = async () => {
  await connectDatabase();
  startRecurringTransactionWorker();
  console.log(`Finance SaaS worker running in ${env.NODE_ENV}`);
};

start().catch((error) => {
  console.error("Failed to start worker", error);
  process.exit(1);
});
