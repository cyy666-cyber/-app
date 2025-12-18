/**
 * 组队路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
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
} = require('../controllers/teamController');

const {
  sendMessage,
  getMessages,
  getMessage,
  updateMessage,
  deleteMessage,
  markAsRead
} = require('../controllers/teamMessageController');

/**
 * @route   GET /api/teams/my-teams
 * @desc    获取用户加入的组队列表
 * @access  Private
 */
router.get('/my-teams', authenticate, getMyTeams);

/**
 * @route   GET /api/teams
 * @desc    获取组队列表
 * @access  Public（可选认证）
 */
router.get('/', optionalAuth, getTeams);

/**
 * @route   POST /api/teams
 * @desc    创建组队
 * @access  Private
 */
router.post('/', authenticate, createTeam);

/**
 * @route   GET /api/teams/:id
 * @desc    获取单个组队详情
 * @access  Public（可选认证）
 */
router.get('/:id', optionalAuth, getTeam);

/**
 * @route   PUT /api/teams/:id
 * @desc    更新组队信息
 * @access  Private（仅队长和 co-leader）
 */
router.put('/:id', authenticate, updateTeam);

/**
 * @route   DELETE /api/teams/:id
 * @desc    删除组队
 * @access  Private（仅队长）
 */
router.delete('/:id', authenticate, deleteTeam);

/**
 * @route   POST /api/teams/:id/join
 * @desc    加入组队
 * @access  Private
 */
router.post('/:id/join', authenticate, joinTeam);

/**
 * @route   POST /api/teams/:id/leave
 * @desc    退出组队
 * @access  Private
 */
router.post('/:id/leave', authenticate, leaveTeam);

/**
 * @route   POST /api/teams/:id/goals
 * @desc    添加组队目标
 * @access  Private（仅队长和 co-leader）
 */
router.post('/:id/goals', authenticate, addGoal);

/**
 * @route   PUT /api/teams/:id/goals/:goalIndex
 * @desc    更新组队目标
 * @access  Private（仅队长和 co-leader）
 */
router.put('/:id/goals/:goalIndex', authenticate, updateGoal);

/**
 * @route   DELETE /api/teams/:id/goals/:goalIndex
 * @desc    删除组队目标
 * @access  Private（仅队长和 co-leader）
 */
router.delete('/:id/goals/:goalIndex', authenticate, deleteGoal);

/**
 * @route   POST /api/teams/:teamId/messages
 * @desc    发送消息到组队聊天室
 * @access  Private
 */
router.post('/:teamId/messages', authenticate, sendMessage);

/**
 * @route   GET /api/teams/:teamId/messages
 * @desc    获取组队聊天室消息列表
 * @access  Private
 */
router.get('/:teamId/messages', authenticate, getMessages);

/**
 * @route   POST /api/teams/messages/:id/read
 * @desc    标记消息已读
 * @access  Private
 */
router.post('/messages/:id/read', authenticate, markAsRead);

/**
 * @route   GET /api/teams/messages/:id
 * @desc    获取单个消息
 * @access  Private
 */
router.get('/messages/:id', authenticate, getMessage);

/**
 * @route   PUT /api/teams/messages/:id
 * @desc    更新消息
 * @access  Private（仅发送者）
 */
router.put('/messages/:id', authenticate, updateMessage);

/**
 * @route   DELETE /api/teams/messages/:id
 * @desc    删除消息
 * @access  Private（仅发送者和管理员）
 */
router.delete('/messages/:id', authenticate, deleteMessage);

module.exports = router;

