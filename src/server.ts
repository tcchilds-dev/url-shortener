import app from "./app.js";
import logger from "./utils/logger.js";
import { connectRedis } from "./utils/redisClient.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectRedis();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Fatal error during server startup:", error);
    process.exit(1);
  }
}

startServer();
