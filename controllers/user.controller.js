import User from "../models/user.model.js";

export const getUserSavedPosts = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(200).json([]); // Return empty array instead of 401
    }

    const user = await User.findOne({ clerkUserId })
      .select("savedPosts")
      .lean();
    res.status(200).json(user?.savedPosts || []);
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(200).json([]); // Return empty array on error
  }
};

export const savePost = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;
    const postId = req.body.postId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Not Authenticated!" });
    }

    const user = await User.findOne({ clerkUserId })
      .select("_id savedPosts")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isSaved = user.savedPosts.some((p) => p.toString() === postId);

    if (!isSaved) {
      await User.findByIdAndUpdate(user._id, {
        $push: { savedPosts: postId },
      });
    } else {
      await User.findByIdAndUpdate(user._id, {
        $pull: { savedPosts: postId },
      });
    }

    res.status(200).json({ message: isSaved ? "Post Unsaved" : "Post Saved" });
  } catch (error) {
    console.error("Error saving/unsaving post:", error);
    res.status(500).json({ error: "Failed to save post" });
  }
};
