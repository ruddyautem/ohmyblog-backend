import express from "express";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import webhookRouter from "./routes/webhook.route.js";
import connectDB from "./lib/connectDB.js";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";

const app = express();
const port = 3000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Frontend URL
    credentials: true, // Allow cookies/headers
    allowedHeaders: ["Content-Type", "Authorization", "x-clerk-auth"], // Clerk headers
  })
);

app.use(clerkMiddleware());
app.use(express.json());

app.use("/webhooks", webhookRouter);
app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    message: error.message || "Something went wrong!",
    status: error.status,
    stack: error.stack,
  });
});

app.listen(port, () => {
  connectDB();
  console.log(`Server is running at http://localhost:${port}`);
});

// ngrok http --url=bengal-learning-internally.ngrok-free.app 3000

// node --env-file .env --watch index.js