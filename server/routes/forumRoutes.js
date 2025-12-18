/**
 * 论坛路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
  createForum,
  getForums,
  getForum,
  joinForum,
  leaveForum,
  updateForum,
  deleteForum,
  getMyForums
} = require('../controllers/forumController');

const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLikePost,
  toggleFavoritePost,
  togglePinPost
} = require('../controllers/postController');

const {
  createReply,
  getReplies,
  getReply,
  updateReply,
  deleteReply,
  toggleLikeReply
} = require('../controllers/replyController');

/**
 * @route   GET /api/forums/my-forums
 * @desc    获取用户加入的论坛列表
 * @access  Private
 */
router.get('/my-forums', authenticate, getMyForums);

/**
 * @route   GET /api/forums
 * @desc    获取论坛列表
 * @access  Public（可选认证）
 */
router.get('/', optionalAuth, getForums);

/**
 * @route   POST /api/forums
 * @desc    创建论坛
 * @access  Private
 */
router.post('/', authenticate, createForum);

/**
 * @route   GET /api/forums/:id
 * @desc    获取单个论坛详情
 * @access  Public（可选认证）
 */
router.get('/:id', optionalAuth, getForum);

/**
 * @route   PUT /api/forums/:id
 * @desc    更新论坛信息
 * @access  Private（仅创建者和管理员）
 */
router.put('/:id', authenticate, updateForum);

/**
 * @route   DELETE /api/forums/:id
 * @desc    删除论坛
 * @access  Private（仅创建者）
 */
router.delete('/:id', authenticate, deleteForum);

/**
 * @route   POST /api/forums/:id/join
 * @desc    加入论坛
 * @access  Private
 */
router.post('/:id/join', authenticate, joinForum);

/**
 * @route   POST /api/forums/:id/leave
 * @desc    退出论坛
 * @access  Private
 */
router.post('/:id/leave', authenticate, leaveForum);

/**
 * @route   POST /api/forums/:forumId/posts
 * @desc    创建帖子
 * @access  Private
 */
router.post('/:forumId/posts', authenticate, createPost);

/**
 * @route   GET /api/forums/:forumId/posts
 * @desc    获取论坛帖子列表
 * @access  Public（可选认证）
 */
router.get('/:forumId/posts', optionalAuth, getPosts);

/**
 * @route   POST /api/posts/:id/like
 * @desc    点赞/取消点赞帖子
 * @access  Private
 */
router.post('/posts/:id/like', authenticate, toggleLikePost);

/**
 * @route   POST /api/posts/:id/favorite
 * @desc    收藏/取消收藏帖子
 * @access  Private
 */
router.post('/posts/:id/favorite', authenticate, toggleFavoritePost);

/**
 * @route   POST /api/posts/:id/pin
 * @desc    置顶/取消置顶帖子
 * @access  Private（仅管理员）
 */
router.post('/posts/:id/pin', authenticate, togglePinPost);

/**
 * @route   GET /api/posts/:id
 * @desc    获取单个帖子详情
 * @access  Public（可选认证）
 */
router.get('/posts/:id', optionalAuth, getPost);

/**
 * @route   PUT /api/posts/:id
 * @desc    更新帖子
 * @access  Private（仅作者和管理员）
 */
router.put('/posts/:id', authenticate, updatePost);

/**
 * @route   DELETE /api/posts/:id
 * @desc    删除帖子
 * @access  Private（仅作者和管理员）
 */
router.delete('/posts/:id', authenticate, deletePost);

/**
 * @route   POST /api/posts/:postId/replies
 * @desc    创建回复
 * @access  Private
 */
router.post('/posts/:postId/replies', authenticate, createReply);

/**
 * @route   GET /api/posts/:postId/replies
 * @desc    获取帖子回复列表
 * @access  Public（可选认证）
 */
router.get('/posts/:postId/replies', optionalAuth, getReplies);

/**
 * @route   POST /api/replies/:id/like
 * @desc    点赞/取消点赞回复
 * @access  Private
 */
router.post('/replies/:id/like', authenticate, toggleLikeReply);

/**
 * @route   GET /api/replies/:id
 * @desc    获取单个回复
 * @access  Public（可选认证）
 */
router.get('/replies/:id', optionalAuth, getReply);

/**
 * @route   PUT /api/replies/:id
 * @desc    更新回复
 * @access  Private（仅作者和管理员）
 */
router.put('/replies/:id', authenticate, updateReply);

/**
 * @route   DELETE /api/replies/:id
 * @desc    删除回复
 * @access  Private（仅作者和管理员）
 */
router.delete('/replies/:id', authenticate, deleteReply);

module.exports = router;

