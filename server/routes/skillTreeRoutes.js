/**
 * 技能树路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getSkillTree,
  createSkillNode,
  getSkillNodes,
  getSkillNode,
  updateSkillNode,
  deleteSkillNode,
  addPrerequisite,
  addChild,
  getSkillTreeStats
} = require('../controllers/skillTreeController');

// 所有路由都需要认证
router.use(authenticate);

/**
 * @route   GET /api/skill-tree
 * @desc    获取用户的技能树
 * @access  Private
 */
router.get('/', getSkillTree);

/**
 * @route   GET /api/skill-tree/stats
 * @desc    获取技能树统计信息
 * @access  Private
 */
router.get('/stats', getSkillTreeStats);

/**
 * @route   POST /api/skill-tree/nodes
 * @desc    创建技能节点
 * @access  Private
 */
router.post('/nodes', createSkillNode);

/**
 * @route   GET /api/skill-tree/nodes
 * @desc    获取技能节点列表
 * @access  Private
 */
router.get('/nodes', getSkillNodes);

/**
 * @route   GET /api/skill-tree/nodes/:id
 * @desc    获取单个技能节点
 * @access  Private
 */
router.get('/nodes/:id', getSkillNode);

/**
 * @route   PUT /api/skill-tree/nodes/:id
 * @desc    更新技能节点
 * @access  Private
 */
router.put('/nodes/:id', updateSkillNode);

/**
 * @route   DELETE /api/skill-tree/nodes/:id
 * @desc    删除技能节点
 * @access  Private
 */
router.delete('/nodes/:id', deleteSkillNode);

/**
 * @route   POST /api/skill-tree/nodes/:id/prerequisites
 * @desc    添加前置技能节点
 * @access  Private
 */
router.post('/nodes/:id/prerequisites', addPrerequisite);

/**
 * @route   POST /api/skill-tree/nodes/:id/children
 * @desc    添加子技能节点
 * @access  Private
 */
router.post('/nodes/:id/children', addChild);

module.exports = router;

