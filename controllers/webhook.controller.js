import { Webhook } from "svix";
import User from "../models/user.model.js";

export const clerkWebHook = async (req, res) => {
  console.log("Webhook received:", req.body.type);
  
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET env variable");
    return res.status(500).json({ message: "Webhook secret is missing" });
  }

  const svix_id = req.headers["svix-id"];
  const svix_timestamp = req.headers["svix-timestamp"];
  const svix_signature = req.headers["svix-signature"];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing Svix headers");
    return res.status(400).json({ message: "Missing Svix headers" });
  }

  const payload = req.body;
  const headers = {
    "svix-id": svix_id,
    "svix-timestamp": svix_timestamp,
    "svix-signature": svix_signature,
  };

  const wh = new Webhook(WEBHOOK_SECRET);
  
  let evt;
  try {
    evt = wh.verify(JSON.stringify(payload), headers);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return res.status(400).json({ message: "Webhook signature verification failed" });
  }

  const eventType = evt.type;
  console.log("Verified webhook event:", eventType);

  try {
    if (eventType === "user.created") {
      const userData = evt.data;
      
      const newUser = new User({
        clerkUserId: userData.id,
        username: userData.username || (userData.email_addresses && userData.email_addresses[0]?.email_address) || `user_${userData.id}`,
        email: userData.email_addresses && userData.email_addresses[0]?.email_address,
        img: userData.image_url,
      });

      await newUser.save();
      console.log("New user created:", newUser._id);
    }

    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ message: "Error processing webhook", error: error.message });
  }
};