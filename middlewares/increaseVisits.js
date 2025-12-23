import Post from "../models/post.model.js";

const increaseVisit = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    await Post.findOneAndUpdate({ slug }, { $inc: { visit: 1 } }).lean();
    next();
  } catch (err) {
    next(); // Continue even if visit count fails
  }
};

export default increaseVisit;
