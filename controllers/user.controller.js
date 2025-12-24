import User from "../models/user.model.js";
import mongoose from "mongoose";

export const getUserSavedPosts = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      console.log("❌ No clerkUserId in getUserSavedPosts");
      return res.status(401).json({ error: "Not Authenticated" });
    }

    const user = await User.findOne({ clerkUserId })
      .select("savedPosts")
      .lean();

    if (!user) {
      console.log(`❌ User not found for clerkUserId: ${clerkUserId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Filter out invalid ObjectIds
    const validSavedPosts = (user.savedPosts || []).filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    console.log(
      `✅ Returning saved posts for ${user.username || clerkUserId}:`,
      validSavedPosts.length,
      "posts"
    );
    res.status(200).json(validSavedPosts);
  } catch (error) {
    console.error("❌ Error in getUserSavedPosts:", error);
    res.status(500).json({ error: "Failed to fetch saved posts" });
  }
};

export const savePost = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;
    const postId = req.body.postId;

    if (!clerkUserId) {
      console.log("❌ No clerkUserId in savePost");
      return res.status(401).json({ error: "Not Authenticated!" });
    }

    if (!postId) {
      console.log("❌ Post ID required in savePost");
      return res.status(400).json({ error: "Post ID required" });
    }

    // ✅ Validate postId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.log("❌ Invalid post ID in savePost");
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const user = await User.findOne({ clerkUserId });

    if (!user) {
      console.log(`❌ User not found for clerkUserId: ${clerkUserId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Convert to ObjectId for comparison
    const postObjectId = new mongoose.Types.ObjectId(postId);
    const postIdStr = postObjectId.toString();

    const isSaved = user.savedPosts.some((p) => p.toString() === postIdStr);

    if (!isSaved) {
      user.savedPosts.push(postObjectId);
      console.log(`✅ [${user.username}] Adding post ${postId}`);
    } else {
      user.savedPosts = user.savedPosts.filter(
        (p) => p.toString() !== postIdStr
      );
      console.log(`✅ [${user.username}] Removing post ${postId}`);
    }

    await user.save();

    console.log(
      `✅ [${user.username}] Updated savedPosts:`,
      user.savedPosts.length,
      "posts"
    );
    res.status(200).json({
      message: isSaved ? "Post Unsaved" : "Post Saved",
      savedPosts: user.savedPosts,
    });
  } catch (error) {
    console.error("❌ Error in savePost:", error);
    res.status(500).json({ error: "Failed to save post" });
  }
};
