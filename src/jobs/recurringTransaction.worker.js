import RecurringTransaction from "../models/RecurringTransaction.js";
import { executeRecurringTransaction } from "../services/recurringTransaction.service.js";
import { env } from "../config/env.js";

let timer = null;
let running = false;

export const runRecurringTransactionWorker = async () => {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const dueRules = await RecurringTransaction.find({
      isActive: true,
      nextRunAt: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    })
      .sort({ nextRunAt: 1 })
      .limit(50)
      .select("_id businessId createdBy nextRunAt");

    for (const rule of dueRules) {
      try {
        await executeRecurringTransaction({
          businessId: rule.businessId,
          recurringId: rule._id,
          userId: rule.createdBy,
        });
      } catch (error) {
        // A duplicate execution key means another worker instance
        // already executed this scheduled occurrence successfully.
        if (error?.code === 11000) continue;

        await RecurringTransaction.updateOne(
          { _id: rule._id },
          { $set: { lastExecutionError: error.message } },
        );
        console.error(
          `Recurring transaction ${rule._id} failed: ${error.message}`,
        );
      }
    }
  } finally {
    running = false;
  }
};

export const startRecurringTransactionWorker = () => {
  if (!env.RECURRING_WORKER_ENABLED) {
    console.log("Recurring transaction worker disabled");
    return () => {};
  }

  const run = () =>
    runRecurringTransactionWorker().catch((error) => {
      console.error(`Recurring worker error: ${error.message}`);
    });

  run();
  timer = setInterval(run, env.RECURRING_WORKER_INTERVAL_MS);
  timer.unref?.();

  console.log(
    `Recurring transaction worker started (${env.RECURRING_WORKER_INTERVAL_MS}ms interval)`,
  );

  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
};
