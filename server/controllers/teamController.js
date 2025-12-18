/**
 * 组队控制器
 * 处理组队的 CRUD 操作和成员管理
 */

const Team = require('../models/Team');
const TeamMessage = require('../models/TeamMessage');
const { getTeamsLean } = require('../utils/queryHelpers');

/**
 * 创建组队
 * @route POST /api/teams
 * @access Private
 */
const createTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, category, tags, goals, settings } = req.body;

    // 输入验证
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '请提供队伍名称'
      });
    }

    // 检查队伍名称是否已存在
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: '队伍名称已被使用'
      });
    }

    // 创建队伍
    const team = new Team({
      name,
      description: description || '',
      leader: userId,
      category: category || 'study',
      tags: tags || [],
      members: [{
        user: userId,
        role: 'leader',
        joinedAt: new Date(),
        status: 'active'
      }],
      goals: goals || [],
      settings: {
        maxMembers: settings?.maxMembers || 10,
        isPublic: settings?.isPublic !== undefined ? settings.isPublic : true,
        requireApproval: settings?.requireApproval !== undefined ? settings.requireApproval : false,
        aiEnabled: settings?.aiEnabled !== undefined ? settings.aiEnabled : true
      },
      stats: {
        messageCount: 0,
        completedGoals: 0,
        totalGoals: goals?.length || 0,
        lastActivityAt: new Date()
      }
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: '组队创建成功',
      data: {
        team
      }
    });

  } catch (error) {
    console.error('创建组队错误:', error);

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
        message: '队伍名称已被使用'
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
 * 获取组队列表
 * @route GET /api/teams
 * @access Public（可选认证）
 */
const getTeams = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {};
    
    // 筛选条件
    if (category) filter.category = category;
    if (search) {
      filter.$text = { $search: search };
    }

    // 排序
    let sort = {};
    if (sortBy === 'lastActivity') {
      sort = { 'stats.lastActivityAt': sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'completedGoals') {
      sort = { 'stats.completedGoals': sortOrder === 'asc' ? 1 : -1 };
    } else {
      sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    }

    const result = await getTeamsLean(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populateLeader: true
    });

    res.json({
      success: true,
      message: '获取组队列表成功',
      data: result
    });

  } catch (error) {
    console.error('获取组队列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个组队详情
 * @route GET /api/teams/:id
 * @access Public（可选认证）
 */
const getTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // 可选

    const team = await Team.findById(id)
      .populate('leader', 'username avatar school')
      .populate('members.user', 'username avatar school');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查用户是否是成员
    let isMember = false;
    let userRole = null;
    let userStatus = null;
    if (userId) {
      const member = team.members.find(m => m.user._id.toString() === userId.toString());
      if (member) {
        isMember = true;
        userRole = member.role;
        userStatus = member.status;
      }
    }

    res.json({
      success: true,
      message: '获取组队详情成功',
      data: {
        team: {
          ...team.toObject(),
          isMember,
          userRole,
          userStatus
        }
      }
    });

  } catch (error) {
    console.error('获取组队详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 加入组队
 * @route POST /api/teams/:id/join
 * @access Private
 */
const joinTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查是否已加入
    const isMember = team.members.some(m => m.user.toString() === userId.toString() && m.status !== 'left');
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: '您已加入该组队'
      });
    }

    // 检查成员数量限制
    const activeMembers = team.members.filter(m => m.status === 'active').length;
    if (activeMembers >= team.settings.maxMembers) {
      return res.status(400).json({
        success: false,
        message: '组队成员已满'
      });
    }

    // 检查是否需要审核
    if (team.settings.requireApproval) {
      // TODO: 实现审核流程
      return res.status(400).json({
        success: false,
        message: '该组队需要审核，请等待队长批准'
      });
    }

    // 添加成员
    team.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date(),
      status: 'active'
    });

    await team.save();

    res.json({
      success: true,
      message: '加入组队成功',
      data: {
        team
      }
    });

  } catch (error) {
    console.error('加入组队错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，加入失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 退出组队
 * @route POST /api/teams/:id/leave
 * @access Private
 */
const leaveTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查是否是队长
    if (team.leader.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: '队长不能退出组队，请先转让队长或解散组队'
      });
    }

    // 移除成员（标记为已离开）
    const memberIndex = team.members.findIndex(m => m.user.toString() === userId.toString() && m.status === 'active');
    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: '您未加入该组队'
      });
    }

    team.members[memberIndex].status = 'left';
    await team.save();

    res.json({
      success: true,
      message: '退出组队成功'
    });

  } catch (error) {
    console.error('退出组队错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，退出失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新组队信息
 * @route PUT /api/teams/:id
 * @access Private（仅队长和 co-leader）
 */
const updateTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updateData = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查权限（队长或 co-leader）
    const isLeader = team.leader.toString() === userId.toString();
    const member = team.members.find(m => m.user.toString() === userId.toString() && m.status === 'active');
    const isCoLeader = member && member.role === 'co-leader';

    if (!isLeader && !isCoLeader) {
      return res.status(403).json({
        success: false,
        message: '无权修改组队信息'
      });
    }

    // 更新允许的字段
    const allowedFields = ['name', 'description', 'category', 'tags', 'settings'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'settings') {
          team.settings = { ...team.settings, ...updateData.settings };
        } else {
          team[field] = updateData[field];
        }
      }
    });

    await team.save();

    res.json({
      success: true,
      message: '组队信息更新成功',
      data: {
        team
      }
    });

  } catch (error) {
    console.error('更新组队信息错误:', error);

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
 * 删除组队
 * @route DELETE /api/teams/:id
 * @access Private（仅队长）
 */
const deleteTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查权限（仅队长）
    if (team.leader.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '只有队长可以删除组队'
      });
    }

    // 删除组队相关的消息
    await TeamMessage.deleteMany({ team: id });

    // 删除组队
    await Team.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '组队删除成功'
    });

  } catch (error) {
    console.error('删除组队错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取用户加入的组队列表
 * @route GET /api/teams/my-teams
 * @access Private
 */
const getMyTeams = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const teams = await Team.find({
      'members.user': userId,
      'members.status': 'active'
    })
      .populate('leader', 'username avatar')
      .sort({ 'stats.lastActivityAt': -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      message: '获取我的组队列表成功',
      data: {
        teams,
        page: parseInt(page),
        limit: parseInt(limit),
        total: teams.length
      }
    });

  } catch (error) {
    console.error('获取我的组队列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 添加组队目标
 * @route POST /api/teams/:id/goals
 * @access Private（仅队长和 co-leader）
 */
const addGoal = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, description, deadline } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: '请提供目标标题'
      });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查权限（队长或 co-leader）
    const isLeader = team.leader.toString() === userId.toString();
    const member = team.members.find(m => m.user.toString() === userId.toString() && m.status === 'active');
    const isCoLeader = member && member.role === 'co-leader';

    if (!isLeader && !isCoLeader) {
      return res.status(403).json({
        success: false,
        message: '无权添加目标'
      });
    }

    // 添加目标
    team.goals.push({
      title,
      description: description || '',
      deadline: deadline ? new Date(deadline) : null,
      status: 'pending',
      createdAt: new Date()
    });

    team.stats.totalGoals += 1;
    await team.save();

    res.json({
      success: true,
      message: '目标添加成功',
      data: {
        team
      }
    });

  } catch (error) {
    console.error('添加目标错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，添加失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新组队目标
 * @route PUT /api/teams/:id/goals/:goalIndex
 * @access Private（仅队长和 co-leader）
 */
const updateGoal = async (req, res) => {
  try {
    const userId = req.userId;
    const { id, goalIndex } = req.params;
    const updateData = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查权限
    const isLeader = team.leader.toString() === userId.toString();
    const member = team.members.find(m => m.user.toString() === userId.toString() && m.status === 'active');
    const isCoLeader = member && member.role === 'co-leader';

    if (!isLeader && !isCoLeader) {
      return res.status(403).json({
        success: false,
        message: '无权修改目标'
      });
    }

    const index = parseInt(goalIndex);
    if (index < 0 || index >= team.goals.length) {
      return res.status(404).json({
        success: false,
        message: '目标不存在'
      });
    }

    // 更新目标
    const goal = team.goals[index];
    if (updateData.title !== undefined) goal.title = updateData.title;
    if (updateData.description !== undefined) goal.description = updateData.description;
    if (updateData.deadline !== undefined) goal.deadline = updateData.deadline ? new Date(updateData.deadline) : null;
    if (updateData.status !== undefined) {
      const oldStatus = goal.status;
      goal.status = updateData.status;
      
      // 如果标记为完成，更新统计
      if (oldStatus !== 'completed' && updateData.status === 'completed') {
        team.stats.completedGoals += 1;
        goal.completedBy = userId;
      } else if (oldStatus === 'completed' && updateData.status !== 'completed') {
        team.stats.completedGoals = Math.max(0, team.stats.completedGoals - 1);
        goal.completedBy = null;
      }
    }

    await team.save();

    res.json({
      success: true,
      message: '目标更新成功',
      data: {
        team
      }
    });

  } catch (error) {
    console.error('更新目标错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，更新失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 删除组队目标
 * @route DELETE /api/teams/:id/goals/:goalIndex
 * @access Private（仅队长和 co-leader）
 */
const deleteGoal = async (req, res) => {
  try {
    const userId = req.userId;
    const { id, goalIndex } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: '组队不存在'
      });
    }

    // 检查权限
    const isLeader = team.leader.toString() === userId.toString();
    const member = team.members.find(m => m.user.toString() === userId.toString() && m.status === 'active');
    const isCoLeader = member && member.role === 'co-leader';

    if (!isLeader && !isCoLeader) {
      return res.status(403).json({
        success: false,
        message: '无权删除目标'
      });
    }

    const index = parseInt(goalIndex);
    if (index < 0 || index >= team.goals.length) {
      return res.status(404).json({
        success: false,
        message: '目标不存在'
      });
    }

    const goal = team.goals[index];
    const wasCompleted = goal.status === 'completed';

    // 删除目标
    team.goals.splice(index, 1);
    team.stats.totalGoals = Math.max(0, team.stats.totalGoals - 1);
    if (wasCompleted) {
      team.stats.completedGoals = Math.max(0, team.stats.completedGoals - 1);
    }

    await team.save();

    res.json({
      success: true,
      message: '目标删除成功'
    });

  } catch (error) {
    console.error('删除目标错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createTeam,
  getTeams,
  getTeam,
  joinTeam,
  leaveTeam,
  updateTeam,
  deleteTeam,
  getMyTeams,
  addGoal,
  updateGoal,
  deleteGoal
};

