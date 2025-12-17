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
      maxPoolSize: 3,
      minPoolSize: 1,
      maxIdleTimeMS: 15000,
      maxConnecting: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      bufferCommands: false,
      autoIndex: false,
      family: 4,
    });

    isConnected = true;
    console.log("✅ MongoDB Connected (Optimized: 3-pool, low-mem)");
  } catch (error) {
    console.error("❌ MongoDB Failed:", error.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
  isConnected = false;
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
  isConnected = true;
});

export default connectDB;