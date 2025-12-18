import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";

export const getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("user", "username img")
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-__v")
      .lean();

    res.json(comments || []);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json([]);
  }
};

export const addComment = async (req, res) => {
  const auth = req.auth();
  const clerkUserId = auth.userId;
  const postId = req.params.postId;

  if (!clerkUserId) {
    return res.status(401).json({ error: "Pas authentifié!" });
  }

  try {
    const user = await User.findOne({ clerkUserId }).select("_id").lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newComment = new Comment({
      ...req.body,
      user: user._id,
      post: postId,
    });

    const savedComment = await newComment.save();

    const populatedComment = await Comment.findById(savedComment._id)
      .populate("user", "username img")
      .lean();

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

export const deleteComment = async (req, res) => {
  const auth = req.auth();
  const clerkUserId = auth.userId;
  const id = req.params.id;

  if (!clerkUserId) {
    return res.status(401).json({ error: "Pas authentifié!" });
  }

  const role = auth.sessionClaims?.metadata?.role || "user";

  if (role === "admin") {
    await Comment.findByIdAndDelete(id);
    return res.status(200).json({ message: "Commentaire supprimé" });
  }

  try {
    const user = await User.findOne({ clerkUserId }).select("_id").lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const deletedComment = await Comment.findOneAndDelete({
      _id: id,
      user: user._id,
    }).lean();

    if (!deletedComment) {
      return res.status(403).json({
        error: "Vous ne pouvez supprimer que vos propres commentaires!",
      });
    }

    res.status(200).json({ message: "Commentaire supprimé" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};
