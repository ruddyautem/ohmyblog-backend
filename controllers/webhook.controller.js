import { Webhook } from "svix";
import User from "../models/user.model.js";

export const clerkWebHook = async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return res.status(500).json({ message: "Webhook secret is missing" });
  }

  const svix_id = req.headers["svix-id"];
  const svix_timestamp = req.headers["svix-timestamp"];
  const svix_signature = req.headers["svix-signature"];

  if (!svix_id || !svix_timestamp || !svix_signature) {
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
    return res
      .status(400)
      .json({ message: "Webhook signature verification failed" });
  }

  const eventType = evt.type;

  try {
    if (eventType === "user.created") {
      const userData = evt.data;

      const newUser = new User({
        clerkUserId: userData.id,
        username:
          userData.username ||
          (userData.email_addresses &&
            userData.email_addresses[0]?.email_address) ||
          `user_${userData.id}`,
        email:
          userData.email_addresses &&
          userData.email_addresses[0]?.email_address,
        img: userData.image_url,
      });

      await newUser.save();
    }

    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error processing webhook" });
  }
};