import app from "./app.js";

import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";

const startServer = async () => {
  await connectDatabase();

  const server =
    app.listen(
      env.PORT,
      () => {
        console.log(
          `Server running on port ${env.PORT}`
        );

        console.log(
          `Environment: ${env.NODE_ENV}`
        );
        // console.log(
        //   `🔗 API: http://localhost:${env.PORT}/api/v1`
        // );
      }
    );

  /*
   * Graceful shutdown
   */
  const shutdown = async (
    signal
  ) => {
    console.log(
      `${signal} received. Shutting down gracefully...`
    );

    server.close(() => {
      console.log(
        "HTTP server closed."
      );

      process.exit(0);
    });
  };

  process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
  );

  process.on(
    "SIGINT",
    () => shutdown("SIGINT")
  );
};

startServer().catch(
  (error) => {
    console.error(
      "❌ Failed to start server"
    );

    console.error(error);

    process.exit(1);
  }
);