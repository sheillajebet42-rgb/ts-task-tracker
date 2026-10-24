import mongoose from "mongoose";
import { createApp } from "./app";
import { config } from "./config";

async function main() {
  await mongoose.connect(config.mongoUri);
  const server = createApp().listen(config.port, () => console.log(`listening on :${config.port}`));
  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

process.on("unhandledRejection", (e) => {
  console.error("unhandled rejection", e);
});
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
