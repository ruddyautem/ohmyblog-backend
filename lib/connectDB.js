import mongoose from "mongoose";

mongoose.set("strictQuery", true);

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    isConnected = true;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO, {
      maxPoolSize: 5,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    isConnected = true;
    console.log("✅ MongoDB Connected (Optimized: 5-pool)");
  } catch (error) {
    console.error("❌ MongoDB Failed:", error.message);
    process.exit(1);
  }
};

// Events
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected → reconnecting...");
  isConnected = false;
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

export default connectDB;
