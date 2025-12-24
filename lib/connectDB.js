import mongoose from "mongoose";

mongoose.set("strictQuery", true);

let isConnected = false;
let listenersAttached = false;

const onDisconnect = () => { isConnected = false; };
const onError = (err) => { isConnected = false; };

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(process.env.MONGO, {
      maxPoolSize: 2,           // Reduced from 3 to 2 for lower RAM
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000, // ✅ Keeps connection from "ghosting"
      bufferCommands: false,
      autoIndex: false,
    });

    isConnected = true;
    if (!listenersAttached) {
      mongoose.connection.on("disconnected", onDisconnect);
      mongoose.connection.on("error", onError);
      listenersAttached = true;
    }
  } catch (error) {
    throw error;
  }
};

export const cleanupDB = () => {
  mongoose.connection.off("disconnected", onDisconnect);
  mongoose.connection.off("error", onError);
  listenersAttached = false;
};

export default connectDB;