import express from "express";
import mongoose from "mongoose";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import webhookRouter from "./routes/webhook.route.js";
import connectDB, { cleanupDB } from "./lib/connectDB.js"; // ✅ CHANGE: Import cleanupDB
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

// ✅ CHANGE: Track intervals and timeouts for cleanup
let memoryInterval = null;
let server = null;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  // ✅ CHANGE: Prevent multiple shutdown calls
  if (isShuttingDown) {
    console.log("⚠️ Shutdown already in progress...");
    return;
  }
  isShuttingDown = true;

  console.log(`\n⚠️ ${signal} received, closing gracefully...`);

  try {
    // ✅ CHANGE: Clear memory interval first
    if (memoryInterval) {
      clearInterval(memoryInterval);
      memoryInterval = null;
      console.log("✅ Memory interval cleared");
    }

    // ✅ CHANGE: Close HTTP server with timeout
    if (server) {
      await new Promise((resolve) => {
        const forceClose = setTimeout(() => {
          console.log("⚠️ Forcing server close after timeout");
          resolve();
        }, 5000);

        server.close(() => {
          clearTimeout(forceClose);
          console.log("✅ HTTP server closed");
          resolve();
        });
      });
    }

    // ✅ CHANGE: Cleanup DB listeners before closing connection
    cleanupDB();
    console.log("✅ DB listeners cleaned up");

    await mongoose.connection.close(false);
    console.log("✅ MongoDB connection closed");

    // ✅ CHANGE: Remove all listeners to prevent memory leaks
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("beforeExit");
    process.removeAllListeners("uncaughtException");
    process.removeAllListeners("unhandledRejection");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err.message);
    process.exit(1);
  }
};

// ✅ CHANGE: Use named function references for signal handlers
const handleSIGTERM = () => gracefulShutdown("SIGTERM");
const handleSIGINT = () => gracefulShutdown("SIGINT");

process.once("SIGTERM", handleSIGTERM);
process.once("SIGINT", handleSIGINT);

// ✅ CHANGE: Add uncaught exception handlers to prevent crashes without cleanup
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit on unhandled rejection, just log it
});

if (process.env.MEMORY_DEBUG === "true") {
  memoryInterval = setInterval(() => {
    const used = process.memoryUsage();
    console.log(
      `📊 Memory: ${Math.round(used.heapUsed / 1024 / 1024)} MB / ${Math.round(
        used.heapTotal / 1024 / 1024
      )} MB (RSS: ${Math.round(used.rss / 1024 / 1024)} MB)`
    );
  }, 60000);
}

(async () => {
  try {
    await connectDB();

    server = app.listen(port, () => {
      console.log(`✅ Server: http://localhost:${port}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "production"}`);
    });

    // ✅ CHANGE: Use once instead of on for error handler
    server.once("error", (err) => {
      console.error("❌ Server error:", err.message);
      gracefulShutdown("serverError");
    });
  } catch (error) {
    console.error("❌ Startup failed:", error.message);
    process.exit(1);
  }
})();

// ngrok http --url=bengal-learning-internally.ngrok-free.app 4000

// node --env-file .env --watch index.js
