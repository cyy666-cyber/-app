/**
 * 知识库路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createKnowledgeBase,
  getKnowledgeBaseList,
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  createFromChat,
  searchKnowledgeBase,
  getKnowledgeBaseStats,
  batchCreateFromChat
} = require('../controllers/knowledgeBaseController');

// 所有路由都需要认证
router.use(authenticate);

/**
 * @route   GET /api/knowledge-base/stats
 * @desc    获取知识库统计信息
 * @access  Private
 */
router.get('/stats', getKnowledgeBaseStats);

/**
 * @route   GET /api/knowledge-base/search
 * @desc    搜索知识库
 * @access  Private
 */
router.get('/search', searchKnowledgeBase);

/**
 * @route   POST /api/knowledge-base/from-chat
 * @desc    从 AI 聊天记录整理到知识库
 * @access  Private
 */
router.post('/from-chat', createFromChat);

/**
 * @route   POST /api/knowledge-base/batch-from-chat
 * @desc    批量从 AI 聊天记录整理到知识库
 * @access  Private
 */
router.post('/batch-from-chat', batchCreateFromChat);

/**
 * @route   POST /api/knowledge-base
 * @desc    创建知识库条目
 * @access  Private
 */
router.post('/', createKnowledgeBase);

/**
 * @route   GET /api/knowledge-base
 * @desc    获取知识库列表
 * @access  Private
 */
router.get('/', getKnowledgeBaseList);

/**
 * @route   GET /api/knowledge-base/:id
 * @desc    获取单个知识库条目
 * @access  Private
 */
router.get('/:id', getKnowledgeBase);

/**
 * @route   PUT /api/knowledge-base/:id
 * @desc    更新知识库条目
 * @access  Private
 */
router.put('/:id', updateKnowledgeBase);

/**
 * @route   DELETE /api/knowledge-base/:id
 * @desc    删除知识库条目
 * @access  Private
 */
router.delete('/:id', deleteKnowledgeBase);

module.exports = router;

