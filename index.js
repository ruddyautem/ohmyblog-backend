import express from "express";
import mongoose from "mongoose";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import webhookRouter from "./routes/webhook.route.js";
import connectDB from "./lib/connectDB.js";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";

const app = express();
const port = 4000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-clerk-auth"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(
  clerkMiddleware({
    debug: false,
  })
);

app.use("/webhooks", webhookRouter);
app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    message: error.message || "Something went wrong!",
    status: error.status,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
  });
});

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received, closing gracefully...`);

  try {
    if (server) {
      server.close(() => {
        console.log("✅ HTTP server closed");
      });
    }

    await mongoose.connection.close(false);
    console.log("✅ MongoDB connection closed");

    if (memoryInterval) clearInterval(memoryInterval);

    process.removeAllListeners();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err.message);
    process.exit(1);
  }
};

process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => gracefulShutdown("SIGINT"));

let memoryInterval;
if (process.env.MEMORY_DEBUG === "true") {
  memoryInterval = setInterval(() => {
    const used = process.memoryUsage();
    const heapMB = Math.round(used.heapUsed / 1024 / 1024);
    const rssMB = Math.round(used.rss / 1024 / 1024);

    console.log(`📊 Memory: Heap ${heapMB}MB / RSS: ${rssMB}MB`);

    // ✅ Force GC if heap exceeds 140MB
    if (heapMB > 140 && global.gc) {
      console.log("🧹 Forcing Garbage Collection...");
      global.gc();
    }
  }, 60000);

  process.once("beforeExit", () => {
    if (memoryInterval) clearInterval(memoryInterval);
  });
}

let server;

(async () => {
  try {
    await connectDB();

    server = app.listen(port, () => {
      console.log(`✅ Server: http://localhost:${port}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "production"}`);
    });

    server.once("error", (err) => {
      console.error("❌ Server error:", err.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Startup failed:", error.message);
    process.exit(1);
  }
})();

// ngrok http --url=bengal-learning-internally.ngrok-free.app 4000

// node --env-file .env --watch index.js
