import Post from "../models/post.model.js";

const increaseVisit = async (req, res, next) => {
  const slug = req.params.slug;
  if (!slug) return next();

  try {
    // ✅ CHANGE: updateOne does NOT return the document to Node RAM
    await Post.updateOne({ slug }, { $inc: { visit: 1 } });
    next();
  } catch (err) {
    next();
  }
};

export default increaseVisit;
