import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import ImageKit from "imagekit";

// ✅ CHANGE: Lazy-load ImageKit instance (singleton pattern)
let imagekitInstance = null;

const getImageKit = () => {
  if (!imagekitInstance) {
    imagekitInstance = new ImageKit({
      urlEndpoint: process.env.IK_URL_ENDPOINT,
      publicKey: process.env.IK_PUBLIC_KEY,
      privateKey: process.env.IK_PRIVATE_KEY,
    });
  }
  return imagekitInstance;
};

export const getPosts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(20, parseInt(req.query.limit) || 10);

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
    // ✅ Run query and count in parallel
    const [posts, totalPosts] = await Promise.all([
      Post.find(query)
        .populate("user", "username")
        .sort(sortObj)
        .limit(limit)
        .skip((page - 1) * limit)
        .select("-content -__v")
        .lean(),
      Post.countDocuments(query)
    ]);

    const hasMore = page * limit < totalPosts;

    res.status(200).json({ posts, hasMore });
  } catch (error) {
    res.status(500).json({ posts: [], hasMore: false });
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug })
      .populate("user", "username img")
      .select("-__v")
      .lean();

    if (!post) {
      return res.status(404).json({ error: "Post non trouvé" });
    }

    // ✅ Background task: Don't wait for the visit increment
    Post.updateOne({ _id: post._id }, { $inc: { visit: 1 } }).exec();

    res.status(200).json(post);
  } catch (error) {
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

    const { title, desc, category, content, img } = req.body;

    let slug = title.replace(/ /g, "-").toLowerCase();
    let existingPost = await Post.findOne({ slug }).select("_id").lean();

    let counter = 2;
    while (existingPost) {
      slug = `${slug}-${counter}`;
      existingPost = await Post.findOne({ slug }).select("_id").lean();
      counter++;
    }

    const newPost = new Post({
      user: user._id,
      slug,
      title,
      desc,
      category,
      content,
      img,
    });

    const savedPost = await newPost.save();

    res.status(200).json({
      _id: savedPost._id,
      slug: savedPost.slug,
      title: savedPost.title,
    });
  } catch (error) {
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
    res.status(500).json({ error: "Failed to feature post" });
  }
};

// ✅ CHANGE: Use lazy-loaded ImageKit instance
export const uploadAuth = async (req, res) => {
  const result = getImageKit().getAuthenticationParameters();
  res.send(result);
};
