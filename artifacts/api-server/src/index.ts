import https from "https";
import fs from "fs";
import path from "path";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const sslOptions = {
  key: fs.readFileSync(path.resolve(__dirname, "../../../localhost+2-key.pem")),
  cert: fs.readFileSync(path.resolve(__dirname, "../../../localhost+2.pem")),
};

const server = https.createServer(sslOptions, app);

server.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
