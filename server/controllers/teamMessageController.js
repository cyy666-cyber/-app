/**
 * 组队消息控制器
 * 处理组队聊天室消息的 CRUD 操作
 */

const TeamMessage = require('../models/TeamMessage');
const Team = require('../models/Team');

/**
 * 发送消息到组队聊天室
 * @route POST /api/teams/:teamId/messages
 * @access Private
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { teamId } = req.params;
    const { content, type = 'text', replyTo, fileUrl, fileName } = req.body;

    // 输入验证
    if (!content && type === 'text') {
      return res.status(400).json({
        success: false,
        message: '请提供消息内容'
      });
    }

    // 检查组队是否存在
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查用户是否是成员
    const isMember = team.members.some(m => 
      m.user.toString() === userId.toString() && m.status === 'active'
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: '您需要先加入该组队才能发送消息'
      });
    }

    // 如果回复消息，检查父消息是否存在
    if (replyTo) {
      const parentMessage = await TeamMessage.findById(replyTo);
      if (!parentMessage || parentMessage.team.toString() !== teamId) {
        return res.status(404).json({
          success: false,
          message: '回复的消息不存在'
        });
      }
    }

    // 创建消息
    const message = new TeamMessage({
      team: teamId,
      sender: userId,
      content: content || '',
      type,
      replyTo: replyTo || null,
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      isAI: false
    });

    await message.save();

    // 更新组队统计
    team.stats.messageCount += 1;
    team.stats.lastActivityAt = new Date();
    await team.save();

    // 填充发送者信息
    await message.populate('sender', 'username avatar');

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('发送消息错误:', error);

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
      message: '服务器错误，发送失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取组队聊天室消息列表
 * @route GET /api/teams/:teamId/messages
 * @access Private
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { teamId } = req.params;
    const { page = 1, limit = 50, type, before } = req.query;

    // 检查组队是否存在
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查用户是否是成员
    const isMember = team.members.some(m => 
      m.user.toString() === userId.toString() && m.status === 'active'
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: '您需要先加入该组队才能查看消息'
      });
    }

    const filter = {
      team: teamId
    };

    if (type) filter.type = type;
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await TeamMessage.find(filter)
      .populate('sender', 'username avatar')
      .populate('replyTo', 'sender content')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const totalCount = await TeamMessage.countDocuments(filter);

    // 标记消息已读
    await TeamMessage.updateMany(
      {
        team: teamId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      message: '获取消息列表成功',
      data: {
        messages: messages.reverse(), // 按时间正序返回
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('获取消息列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个消息
 * @route GET /api/teams/messages/:id
 * @access Private
 */
const getMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const message = await TeamMessage.findById(id)
      .populate('sender', 'username avatar')
      .populate('team', 'name')
      .populate('replyTo', 'sender content');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }

    // 检查用户是否是成员
    const team = await Team.findById(message.team);
    const isMember = team.members.some(m => 
      m.user.toString() === userId.toString() && m.status === 'active'
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: '无权查看该消息'
      });
    }

    res.json({
      success: true,
      message: '获取消息成功',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('获取消息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新消息
 * @route PUT /api/teams/messages/:id
 * @access Private（仅发送者）
 */
const updateMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: '请提供消息内容'
      });
    }

    const message = await TeamMessage.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }

    // 检查权限（仅发送者）
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权修改该消息'
      });
    }

    message.content = content;
    await message.save();

    res.json({
      success: true,
      message: '消息更新成功',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('更新消息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，更新失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 删除消息
 * @route DELETE /api/teams/messages/:id
 * @access Private（仅发送者和管理员）
 */
const deleteMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const message = await TeamMessage.findById(id).populate('team');
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }

    // 检查权限（发送者或管理员）
    const isSender = message.sender.toString() === userId.toString();
    const team = await Team.findById(message.team);
    const member = team.members.find(m => m.user.toString() === userId.toString() && m.status === 'active');
    const isAdmin = member && (member.role === 'leader' || member.role === 'co-leader');

    if (!isSender && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权删除该消息'
      });
    }

    await TeamMessage.findByIdAndDelete(id);

    // 更新组队统计
    if (team) {
      team.stats.messageCount = Math.max(0, team.stats.messageCount - 1);
      await team.save();
    }

    res.json({
      success: true,
      message: '消息删除成功'
    });

  } catch (error) {
    console.error('删除消息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 标记消息已读
 * @route POST /api/teams/messages/:id/read
 * @access Private
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const message = await TeamMessage.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }

    // 检查是否已读
    const isRead = message.readBy.some(r => r.user.toString() === userId.toString());
    if (!isRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await message.save();
    }

    res.json({
      success: true,
      message: '消息已标记为已读'
    });

  } catch (error) {
    console.error('标记已读错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getMessage,
  updateMessage,
  deleteMessage,
  markAsRead
};

