import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import ImageKit from "imagekit";

export const getPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 2;

  const query = {};

  const cat = req.query.cat;
  const author = req.query.author;
  const searchQuery = req.query.search;
  const sortQuery = req.query.sort;
  const featured = req.query.featured;

  if (cat) {
    query.category = cat;
  }

  if (searchQuery) {
    query.title = { $regex: searchQuery, $options: "i" };
  }

  if (author) {
    const user = await User.findOne({ username: author }).select("_id").lean();

    if (!user) {
      return res.status(404).json({ posts: [], hasMore: false });
    }

    query.user = user._id;
  }

  let sortObj = { createdAt: -1 };

  if (sortQuery) {
    switch (sortQuery) {
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "popular":
        sortObj = { visit: -1 };
        break;
      case "trending":
        sortObj = { visit: -1 };
        query.createdAt = {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
    }
  }

  if (featured) {
    query.isFeatured = true;
  }

  try {
    const posts = await Post.find(query)
      .populate("user", "username")
      .sort(sortObj)
      .limit(limit)
      .skip((page - 1) * limit)
      .select("-content -__v")
      .lean();

    const totalPosts = await Post.countDocuments(query);
    const hasMore = page * limit < totalPosts;

    res.status(200).json({ posts, hasMore });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ posts: [], hasMore: false });
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { visit: 1 } },
      { new: true }
    )
      .populate("user", "username img")
      .select("-__v")
      .lean();

    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

export const createPost = async (req, res) => {
  const auth = req.auth();
  const clerkUserId = auth.userId;

  if (!clerkUserId) {
    return res.status(401).json({ error: "Not Authenticated" });
  }

  try {
    const user = await User.findOne({ clerkUserId }).select("_id").lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let slug = req.body.title.replace(/ /g, "-").toLowerCase();
    let existingPost = await Post.findOne({ slug }).select("_id").lean();

    let counter = 2;
    while (existingPost) {
      slug = `${slug}-${counter}`;
      existingPost = await Post.findOne({ slug }).select("_id").lean();
      counter++;
    }

    const newPost = new Post({ user: user._id, slug, ...req.body });
    const post = await newPost.save();

    res.status(200).json(post.toObject());
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
};

export const deletePost = async (req, res) => {
  const auth = req.auth();
  const clerkUserId = auth.userId;

  if (!clerkUserId) {
    return res.status(401).json({ error: "Pas authentifié!" });
  }

  const role = auth.sessionClaims?.metadata?.role || "user";

  if (role === "admin") {
    await Post.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Post supprimé" });
  }

  try {
    const user = await User.findOne({ clerkUserId }).select("_id").lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const deletedPost = await Post.findOneAndDelete({
      _id: req.params.id,
      user: user._id,
    }).lean();

    if (!deletedPost) {
      return res
        .status(403)
        .json({ error: "Vous ne pouvez supprimer que vos propres posts!" });
    }

    res.status(200).json({ message: "Post supprimé" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

export const featurePost = async (req, res) => {
  const auth = req.auth();
  const clerkUserId = auth.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    return res.status(401).json({ error: "Pas authentifié!" });
  }

  const role = auth.sessionClaims?.metadata?.role || "user";

  if (role !== "admin") {
    return res
      .status(403)
      .json({ error: "Vous ne pouvez pas mettre un poste en vedette" });
  }

  try {
    const post = await Post.findById(postId).select("isFeatured").lean();

    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { isFeatured: !post.isFeatured },
      { new: true, select: "isFeatured title slug" }
    ).lean();

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error featuring post:", error);
    res.status(500).json({ error: "Failed to feature post" });
  }
};

const imagekit = new ImageKit({
  urlEndpoint: process.env.IK_URL_ENDPOINT,
  publicKey: process.env.IK_PUBLIC_KEY,
  privateKey: process.env.IK_PRIVATE_KEY,
});

export const uploadAuth = async (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
};
