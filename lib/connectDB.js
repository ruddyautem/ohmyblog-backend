import mongoose from "mongoose";

mongoose.set("strictQuery", true);

let isConnected = false;
let listenersAttached = false;

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

    if (!listenersAttached) {
      mongoose.connection.once("disconnected", () => {
        console.log("⚠️ MongoDB disconnected");
        isConnected = false;
      });

      // ✅ FIX: Changed .on() to .once()
      // This was accumulating error handlers in memory!
      mongoose.connection.once("error", (err) => {
        console.error("❌ MongoDB error:", err.message);
      });

      mongoose.connection.once("reconnected", () => {
        console.log("✅ MongoDB reconnected");
        isConnected = true;
      });

      listenersAttached = true;
    }
  } catch (error) {
    console.error("❌ MongoDB Failed:", error.message);
    throw error;
  }
};

export default connectDB;
