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
    await mongoose.connection.close(false);
    console.log("✅ MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

if (process.env.MEMORY_DEBUG === "true") {
  setInterval(() => {
    const used = process.memoryUsage();
    console.log(
      `📊 Memory: ${Math.round(used.heapUsed / 1024 / 1024)} MB / ${Math.round(
        used.heapTotal / 1024 / 1024
      )} MB`
    );
  }, 60000);
}

(async () => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`✅ Server: http://localhost:${port}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Startup failed:", error);
    process.exit(1);
  }
})();

// ngrok http --url=bengal-learning-internally.ngrok-free.app 4000

// node --env-file .env --watch index.js
