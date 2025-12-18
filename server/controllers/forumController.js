/**
 * 论坛控制器
 * 处理论坛的 CRUD 操作和成员管理
 */

const Forum = require('../models/Forum');
const Post = require('../models/Post');
const Reply = require('../models/Reply');
const { getForumsLean, getPostsLean } = require('../utils/queryHelpers');

/**
 * 创建论坛
 * @route POST /api/forums
 * @access Private
 */
const createForum = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, category, tags, settings } = req.body;

    // 输入验证
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '请提供论坛名称'
      });
    }

    // 检查论坛名称是否已存在
    const existingForum = await Forum.findOne({ name });
    if (existingForum) {
      return res.status(409).json({
        success: false,
        message: '论坛名称已被使用'
      });
    }

    // 创建论坛
    const forum = new Forum({
      name,
      description: description || '',
      creator: userId,
      category: category || 'academic',
      tags: tags || [],
      members: [{
        user: userId,
        role: 'admin',
        joinedAt: new Date()
      }],
      settings: {
        isPublic: settings?.isPublic !== undefined ? settings.isPublic : true,
        requireApproval: settings?.requireApproval !== undefined ? settings.requireApproval : false,
        aiEnabled: settings?.aiEnabled !== undefined ? settings.aiEnabled : true
      },
      stats: {
        memberCount: 1,
        postCount: 0,
        replyCount: 0,
        lastActivityAt: new Date()
      }
    });

    await forum.save();

    res.status(201).json({
      success: true,
      message: '论坛创建成功',
      data: {
        forum
      }
    });

  } catch (error) {
    console.error('创建论坛错误:', error);

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

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '论坛名称已被使用'
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
 * 获取论坛列表
 * @route GET /api/forums
 * @access Public（可选认证）
 */
const getForums = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, sortBy = 'memberCount', sortOrder = 'desc' } = req.query;

    const filter = {};
    
    // 筛选条件
    if (category) filter.category = category;
    if (search) {
      filter.$text = { $search: search };
    }

    // 排序
    let sort = {};
    if (sortBy === 'memberCount') {
      sort = { 'stats.memberCount': sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'postCount') {
      sort = { 'stats.postCount': sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'lastActivity') {
      sort = { 'stats.lastActivityAt': sortOrder === 'asc' ? 1 : -1 };
    } else {
      sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    }

    const result = await getForumsLean(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: { path: 'creator', select: 'username avatar' }
    });

    res.json({
      success: true,
      message: '获取论坛列表成功',
      data: result
    });

  } catch (error) {
    console.error('获取论坛列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个论坛详情
 * @route GET /api/forums/:id
 * @access Public（可选认证）
 */
const getForum = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // 可选，用于检查是否已加入

    const forum = await Forum.findById(id)
      .populate('creator', 'username avatar')
      .populate('members.user', 'username avatar');

    if (!forum) {
      return res.status(404).json({
        success: false,
        message: '论坛不存在'
      });
    }

    // 检查用户是否已加入
    let isMember = false;
    let userRole = null;
    if (userId) {
      const member = forum.members.find(m => m.user._id.toString() === userId.toString());
      if (member) {
        isMember = true;
        userRole = member.role;
      }
    }

    res.json({
      success: true,
      message: '获取论坛详情成功',
      data: {
        forum: {
          ...forum.toObject(),
          isMember,
          userRole
        }
      }
    });

  } catch (error) {
    console.error('获取论坛详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 加入论坛
 * @route POST /api/forums/:id/join
 * @access Private
 */
const joinForum = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const forum = await Forum.findById(id);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: '论坛不存在'
      });
    }

    // 检查是否已加入
    const isMember = forum.members.some(m => m.user.toString() === userId.toString());
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: '您已加入该论坛'
      });
    }

    // 检查是否需要审核
    if (forum.settings.requireApproval) {
      // TODO: 实现审核流程
      return res.status(400).json({
        success: false,
        message: '该论坛需要审核，请等待管理员批准'
      });
    }

    // 添加成员
    forum.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });

    forum.stats.memberCount += 1;
    await forum.save();

    res.json({
      success: true,
      message: '加入论坛成功',
      data: {
        forum
      }
    });

  } catch (error) {
    console.error('加入论坛错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，加入失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 退出论坛
 * @route POST /api/forums/:id/leave
 * @access Private
 */
const leaveForum = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const forum = await Forum.findById(id);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: '论坛不存在'
      });
    }

    // 检查是否是创建者
    if (forum.creator.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: '创建者不能退出论坛'
      });
    }

    // 移除成员
    const memberIndex = forum.members.findIndex(m => m.user.toString() === userId.toString());
    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: '您未加入该论坛'
      });
    }

    forum.members.splice(memberIndex, 1);
    forum.stats.memberCount = Math.max(0, forum.stats.memberCount - 1);
    await forum.save();

    res.json({
      success: true,
      message: '退出论坛成功'
    });

  } catch (error) {
    console.error('退出论坛错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，退出失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新论坛信息
 * @route PUT /api/forums/:id
 * @access Private（仅创建者和管理员）
 */
const updateForum = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updateData = req.body;

    const forum = await Forum.findById(id);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: '论坛不存在'
      });
    }

    // 检查权限（创建者或管理员）
    const isCreator = forum.creator.toString() === userId.toString();
    const member = forum.members.find(m => m.user.toString() === userId.toString());
    const isAdmin = member && (member.role === 'admin' || member.role === 'moderator');

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权修改论坛信息'
      });
    }

    // 更新允许的字段
    const allowedFields = ['name', 'description', 'category', 'tags', 'settings'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'settings') {
          forum.settings = { ...forum.settings, ...updateData.settings };
        } else {
          forum[field] = updateData[field];
        }
      }
    });

    await forum.save();

    res.json({
      success: true,
      message: '论坛信息更新成功',
      data: {
        forum
      }
    });

  } catch (error) {
    console.error('更新论坛信息错误:', error);

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
 * 删除论坛
 * @route DELETE /api/forums/:id
 * @access Private（仅创建者）
 */
const deleteForum = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const forum = await Forum.findById(id);
    if (!forum) {
      return res.status(404).json({
        success: false,
        message: '论坛不存在'
      });
    }

    // 检查权限（仅创建者）
    if (forum.creator.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '只有创建者可以删除论坛'
      });
    }

    // 删除论坛相关的帖子和回复
    await Post.deleteMany({ forum: id });
    await Reply.deleteMany({ post: { $in: await Post.find({ forum: id }).distinct('_id') } });

    // 删除论坛
    await Forum.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '论坛删除成功'
    });

  } catch (error) {
    console.error('删除论坛错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取用户加入的论坛列表
 * @route GET /api/forums/my-forums
 * @access Private
 */
const getMyForums = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const forums = await Forum.find({
      'members.user': userId
    })
      .populate('creator', 'username avatar')
      .sort({ 'stats.lastActivityAt': -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      message: '获取我的论坛列表成功',
      data: {
        forums,
        page: parseInt(page),
        limit: parseInt(limit),
        total: forums.length
      }
    });

  } catch (error) {
    console.error('获取我的论坛列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createForum,
  getForums,
  getForum,
  joinForum,
  leaveForum,
  updateForum,
  deleteForum,
  getMyForums
};

