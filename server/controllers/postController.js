/**
 * 帖子控制器
 * 处理帖子的 CRUD 操作和互动功能
 */

const Post = require('../models/Post');
const Reply = require('../models/Reply');
const Forum = require('../models/Forum');
const { getPostsLean } = require('../utils/queryHelpers');

/**
 * 创建帖子
 * @route POST /api/forums/:forumId/posts
 * @access Private
 */
const createPost = async (req, res) => {
  try {
    const userId = req.userId;
    const { forumId } = req.params;
    const { title, content, tags } = req.body;

    // 输入验证
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '请提供标题和内容'
      });
    }

    // 检查论坛是否存在
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: '论坛不存在'
      });
    }

    // 检查用户是否已加入论坛
    const isMember = forum.members.some(m => m.user.toString() === userId.toString());
    if (!isMember && forum.settings.requireApproval) {
      return res.status(403).json({
        success: false,
        message: '您需要先加入该论坛才能发帖'
      });
    }

    // 创建帖子
    const post = new Post({
      forum: forumId,
      author: userId,
      title,
      content,
      tags: tags || [],
      status: 'published'
    });

    await post.save();

    // 更新论坛统计
    forum.stats.postCount += 1;
    forum.stats.lastActivityAt = new Date();
    await forum.save();

    // 填充作者信息
    await post.populate('author', 'username avatar');

    res.status(201).json({
      success: true,
      message: '帖子创建成功',
      data: {
        post
      }
    });

  } catch (error) {
    console.error('创建帖子错误:', error);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });

      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误，创建失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取论坛帖子列表
 * @route GET /api/forums/:forumId/posts
 * @access Public（可选认证）
 */
const getPosts = async (req, res) => {
  try {
    const { forumId } = req.params;
    const { page = 1, limit = 20, status = 'published', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // 检查论坛是否存在
    const forum = await Forum.findById(forumId);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: '论坛不存在'
      });
    }

    const filter = {
      forum: forumId,
      status
    };

    // 排序
    let sort = {};
    if (sortBy === 'createdAt') {
      sort = { isPinned: -1, createdAt: sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'replyCount') {
      sort = { isPinned: -1, replyCount: sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'viewCount') {
      sort = { isPinned: -1, viewCount: sortOrder === 'asc' ? 1 : -1 };
    } else {
      sort = { isPinned: -1, createdAt: -1 };
    }

    const result = await getPostsLean(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populateAuthor: true
    });

    res.json({
      success: true,
      message: '获取帖子列表成功',
      data: result
    });

  } catch (error) {
    console.error('获取帖子列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个帖子详情
 * @route GET /api/posts/:id
 * @access Public（可选认证）
 */
const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // 可选

    const post = await Post.findById(id)
      .populate('author', 'username avatar school')
      .populate('forum', 'name');

    if (!post || post.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: '帖子不存在'
      });
    }

    // 增加浏览量
    post.viewCount += 1;
    await post.save();

    // 检查用户是否已点赞或收藏
    let isLiked = false;
    let isFavorited = false;
    if (userId) {
      isLiked = post.likes.some(like => like.user.toString() === userId.toString());
      isFavorited = post.favorites.some(fav => fav.user.toString() === userId.toString());
    }

    res.json({
      success: true,
      message: '获取帖子详情成功',
      data: {
        post: {
          ...post.toObject(),
          isLiked,
          isFavorited
        }
      }
    });

  } catch (error) {
    console.error('获取帖子详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新帖子
 * @route PUT /api/posts/:id
 * @access Private（仅作者和管理员）
 */
const updatePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updateData = req.body;

    const post = await Post.findById(id).populate('forum');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在'
      });
    }

    // 检查权限（作者或管理员）
    const isAuthor = post.author.toString() === userId.toString();
    const forum = await Forum.findById(post.forum);
    const member = forum.members.find(m => m.user.toString() === userId.toString());
    const isAdmin = member && (member.role === 'admin' || member.role === 'moderator');

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权修改该帖子'
      });
    }

    // 更新允许的字段
    const allowedFields = ['title', 'content', 'tags', 'status'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        post[field] = updateData[field];
      }
    });

    await post.save();

    res.json({
      success: true,
      message: '帖子更新成功',
      data: {
        post
      }
    });

  } catch (error) {
    console.error('更新帖子错误:', error);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });

      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误，更新失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 删除帖子
 * @route DELETE /api/posts/:id
 * @access Private（仅作者和管理员）
 */
const deletePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const post = await Post.findById(id).populate('forum');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在'
      });
    }

    // 检查权限（作者或管理员）
    const isAuthor = post.author.toString() === userId.toString();
    const forum = await Forum.findById(post.forum);
    const member = forum.members.find(m => m.user.toString() === userId.toString());
    const isAdmin = member && (member.role === 'admin' || member.role === 'moderator');

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权删除该帖子'
      });
    }

    // 软删除（标记为已删除）
    post.status = 'deleted';
    await post.save();

    // 删除所有回复
    await Reply.updateMany({ post: id }, { status: 'deleted' });

    // 更新论坛统计
    if (forum) {
      forum.stats.postCount = Math.max(0, forum.stats.postCount - 1);
      await forum.save();
    }

    res.json({
      success: true,
      message: '帖子删除成功'
    });

  } catch (error) {
    console.error('删除帖子错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 点赞/取消点赞帖子
 * @route POST /api/posts/:id/like
 * @access Private
 */
const toggleLikePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post || post.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: '帖子不存在'
      });
    }

    const likeIndex = post.likes.findIndex(like => like.user.toString() === userId.toString());

    if (likeIndex === -1) {
      // 点赞
      post.likes.push({
        user: userId,
        createdAt: new Date()
      });
    } else {
      // 取消点赞
      post.likes.splice(likeIndex, 1);
    }

    await post.save();

    // 更新点赞数（Post 模型中的 likes 是数组，需要计算长度）
    const likesCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);

    res.json({
      success: true,
      message: likeIndex === -1 ? '点赞成功' : '取消点赞成功',
      data: {
        liked: likeIndex === -1,
        likesCount
      }
    });

  } catch (error) {
    console.error('点赞帖子错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 收藏/取消收藏帖子
 * @route POST /api/posts/:id/favorite
 * @access Private
 */
const toggleFavoritePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post || post.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: '帖子不存在'
      });
    }

    const favoriteIndex = post.favorites.findIndex(fav => fav.user.toString() === userId.toString());

    if (favoriteIndex === -1) {
      // 收藏
      post.favorites.push({
        user: userId,
        createdAt: new Date()
      });
    } else {
      // 取消收藏
      post.favorites.splice(favoriteIndex, 1);
    }

    await post.save();

    res.json({
      success: true,
      message: favoriteIndex === -1 ? '收藏成功' : '取消收藏成功',
      data: {
        favorited: favoriteIndex === -1
      }
    });

  } catch (error) {
    console.error('收藏帖子错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 置顶/取消置顶帖子
 * @route POST /api/posts/:id/pin
 * @access Private（仅管理员）
 */
const togglePinPost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const post = await Post.findById(id).populate('forum');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: '帖子不存在'
      });
    }

    // 检查权限（管理员）
    const forum = await Forum.findById(post.forum);
    const member = forum.members.find(m => m.user.toString() === userId.toString());
    const isAdmin = member && (member.role === 'admin' || member.role === 'moderator');

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以置顶帖子'
      });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.json({
      success: true,
      message: post.isPinned ? '置顶成功' : '取消置顶成功',
      data: {
        isPinned: post.isPinned
      }
    });

  } catch (error) {
    console.error('置顶帖子错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLikePost,
  toggleFavoritePost,
  togglePinPost
};

