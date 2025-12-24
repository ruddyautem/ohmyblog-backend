import mongoose from "mongoose";

mongoose.set("strictQuery", true);

let isConnected = false;
let listenersAttached = false;

// ✅ CHANGE: Store named references for cleanup
const onDisconnect = () => {
  console.log("⚠️ MongoDB disconnected");
  isConnected = false;
};
const onError = (err) => console.error("❌ MongoDB error:", err.message);

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
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      bufferCommands: false,
      autoIndex: false,
      family: 4,
    });

    isConnected = true;
    console.log("✅ MongoDB Connected (3-pool mode)");

    // ✅ CHANGE: Only attach listeners once, and use named functions
    if (!listenersAttached) {
      mongoose.connection.on("disconnected", onDisconnect);
      mongoose.connection.on("error", onError);
      listenersAttached = true;
    }
  } catch (error) {
    console.error("❌ MongoDB Failed:", error.message);
    throw error;
  }
};

// ✅ NEW: Cleanup for graceful shutdown
export const cleanupDB = () => {
  mongoose.connection.off("disconnected", onDisconnect);
  mongoose.connection.off("error", onError);
  listenersAttached = false;
};

export default connectDB;
