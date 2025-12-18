/**
 * 回复控制器
 * 处理回复的 CRUD 操作和互动功能
 */

const Reply = require('../models/Reply');
const Post = require('../models/Post');
const Forum = require('../models/Forum');

/**
 * 创建回复
 * @route POST /api/posts/:postId/replies
 * @access Private
 */
const createReply = async (req, res) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { content, parentReply } = req.body;

    // 输入验证
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '请提供回复内容'
      });
    }

    // 检查帖子是否存在
    const post = await Post.findById(postId).populate('forum');
    if (!post || post.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: '帖子不存在'
      });
    }

    // 检查用户是否已加入论坛
    const forum = await Forum.findById(post.forum);
    const isMember = forum.members.some(m => m.user.toString() === userId.toString());
    if (!isMember && forum.settings.requireApproval) {
      return res.status(403).json({
        success: false,
        message: '您需要先加入该论坛才能回复'
      });
    }

    // 如果指定了父回复，检查是否存在
    if (parentReply) {
      const parent = await Reply.findById(parentReply);
      if (!parent || parent.status === 'deleted') {
        return res.status(404).json({
          success: false,
          message: '父回复不存在'
        });
      }
    }

    // 创建回复
    const reply = new Reply({
      post: postId,
      author: userId,
      content,
      parentReply: parentReply || null,
      status: 'published'
    });

    await reply.save();

    // 更新帖子回复数
    post.replyCount += 1;
    await post.save();

    // 更新论坛统计
    forum.stats.replyCount += 1;
    forum.stats.lastActivityAt = new Date();
    await forum.save();

    // 填充作者信息
    await reply.populate('author', 'username avatar');

    res.status(201).json({
      success: true,
      message: '回复创建成功',
      data: {
        reply
      }
    });

  } catch (error) {
    console.error('创建回复错误:', error);

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
 * 获取帖子回复列表
 * @route GET /api/posts/:postId/replies
 * @access Public（可选认证）
 */
const getReplies = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20, parentReply = null } = req.query;

    // 检查帖子是否存在
    const post = await Post.findById(postId);
    if (!post || post.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: '帖子不存在'
      });
    }

    const filter = {
      post: postId,
      status: 'published'
    };

    if (parentReply === 'null' || parentReply === null) {
      filter.parentReply = null; // 只获取顶级回复
    } else if (parentReply) {
      filter.parentReply = parentReply; // 获取特定回复的子回复
    }

    const replies = await Reply.find(filter)
      .populate('author', 'username avatar')
      .populate('parentReply', 'author content')
      .sort({ createdAt: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Reply.countDocuments(filter);

    res.json({
      success: true,
      message: '获取回复列表成功',
      data: {
        replies,
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('获取回复列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个回复
 * @route GET /api/replies/:id
 * @access Public（可选认证）
 */
const getReply = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // 可选

    const reply = await Reply.findById(id)
      .populate('author', 'username avatar')
      .populate('post', 'title')
      .populate('parentReply', 'author content');

    if (!reply || reply.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: '回复不存在'
      });
    }

    // 检查用户是否已点赞
    let isLiked = false;
    if (userId) {
      isLiked = reply.likes.some(like => like.user.toString() === userId.toString());
    }

    res.json({
      success: true,
      message: '获取回复成功',
      data: {
        reply: {
          ...reply.toObject(),
          isLiked
        }
      }
    });

  } catch (error) {
    console.error('获取回复错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新回复
 * @route PUT /api/replies/:id
 * @access Private（仅作者和管理员）
 */
const updateReply = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '请提供回复内容'
      });
    }

    const reply = await Reply.findById(id).populate('post');
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: '回复不存在'
      });
    }

    // 检查权限（作者或管理员）
    const isAuthor = reply.author.toString() === userId.toString();
    const post = await Post.findById(reply.post);
    const forum = await Forum.findById(post.forum);
    const member = forum.members.find(m => m.user.toString() === userId.toString());
    const isAdmin = member && (member.role === 'admin' || member.role === 'moderator');

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权修改该回复'
      });
    }

    reply.content = content;
    await reply.save();

    res.json({
      success: true,
      message: '回复更新成功',
      data: {
        reply
      }
    });

  } catch (error) {
    console.error('更新回复错误:', error);

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
 * 删除回复
 * @route DELETE /api/replies/:id
 * @access Private（仅作者和管理员）
 */
const deleteReply = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const reply = await Reply.findById(id).populate('post');
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: '回复不存在'
      });
    }

    // 检查权限（作者或管理员）
    const isAuthor = reply.author.toString() === userId.toString();
    const post = await Post.findById(reply.post);
    const forum = await Forum.findById(post.forum);
    const member = forum.members.find(m => m.user.toString() === userId.toString());
    const isAdmin = member && (member.role === 'admin' || member.role === 'moderator');

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权删除该回复'
      });
    }

    // 软删除
    reply.status = 'deleted';
    await reply.save();

    // 更新帖子回复数
    if (post) {
      post.replyCount = Math.max(0, post.replyCount - 1);
      await post.save();
    }

    // 更新论坛统计
    if (forum) {
      forum.stats.replyCount = Math.max(0, forum.stats.replyCount - 1);
      await forum.save();
    }

    res.json({
      success: true,
      message: '回复删除成功'
    });

  } catch (error) {
    console.error('删除回复错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 点赞/取消点赞回复
 * @route POST /api/replies/:id/like
 * @access Private
 */
const toggleLikeReply = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const reply = await Reply.findById(id);
    if (!reply || reply.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: '回复不存在'
      });
    }

    const likeIndex = reply.likes.findIndex(like => like.user.toString() === userId.toString());

    if (likeIndex === -1) {
      // 点赞
      reply.likes.push({
        user: userId,
        createdAt: new Date()
      });
    } else {
      // 取消点赞
      reply.likes.splice(likeIndex, 1);
    }

    await reply.save();

    res.json({
      success: true,
      message: likeIndex === -1 ? '点赞成功' : '取消点赞成功',
      data: {
        liked: likeIndex === -1,
        likesCount: reply.likes.length
      }
    });

  } catch (error) {
    console.error('点赞回复错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createReply,
  getReplies,
  getReply,
  updateReply,
  deleteReply,
  toggleLikeReply
};

