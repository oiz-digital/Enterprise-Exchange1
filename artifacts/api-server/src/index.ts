import { loadEnv } from "./config/env";
import { startServer } from "./server";

try {
  await startServer(loadEnv());
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Unable to start server"}\n`,
  );
  process.exit(1);
}