/**
 * 日程计划路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');

// 所有路由都需要认证
router.use(authenticate);

/**
 * @route   POST /api/schedules
 * @desc    创建日程计划
 * @access  Private
 */
router.post('/', createSchedule);

/**
 * @route   GET /api/schedules
 * @desc    获取日程计划列表
 * @access  Private
 */
router.get('/', getSchedules);

/**
 * @route   GET /api/schedules/:id
 * @desc    获取单个日程计划
 * @access  Private
 */
router.get('/:id', getSchedule);

/**
 * @route   PUT /api/schedules/:id
 * @desc    更新日程计划
 * @access  Private
 */
router.put('/:id', updateSchedule);

/**
 * @route   DELETE /api/schedules/:id
 * @desc    删除日程计划
 * @access  Private
 */
router.delete('/:id', deleteSchedule);

module.exports = router;

