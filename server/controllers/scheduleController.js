/**
 * 日程计划控制器
 * 处理日程计划的 CRUD 操作
 */

const Schedule = require('../models/Schedule');
const { getSchedulesLean } = require('../utils/queryHelpers');

/**
 * 创建日程计划
 * @route POST /api/schedules
 * @access Private
 */
const createSchedule = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, date, startTime, endTime, type, priority, tags } = req.body;

    // 输入验证
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: '请提供标题、日期和时间'
      });
    }

    // 创建日程计划
    const schedule = new Schedule({
      user: userId,
      title,
      description: description || '',
      date: new Date(date),
      startTime,
      endTime,
      type: type || 'study',
      priority: priority || 'medium',
      status: 'pending',
      tags: tags || []
    });

    await schedule.save();

    res.status(201).json({
      success: true,
      message: '日程计划创建成功',
      data: {
        schedule
      }
    });

  } catch (error) {
    console.error('创建日程计划错误:', error);

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
 * 获取用户的日程计划列表
 * @route GET /api/schedules
 * @access Private
 */
const getSchedules = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, status, type, date } = req.query;

    const filter = { user: userId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (date) filter.date = new Date(date);

    const result = await getSchedulesLean(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { date: 1, startTime: 1 }
    });

    res.json({
      success: true,
      message: '获取日程计划列表成功',
      data: result
    });

  } catch (error) {
    console.error('获取日程计划列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个日程计划
 * @route GET /api/schedules/:id
 * @access Private
 */
const getSchedule = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const schedule = await Schedule.findOne({
      _id: id,
      user: userId
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: '日程计划不存在'
      });
    }

    res.json({
      success: true,
      message: '获取日程计划成功',
      data: {
        schedule
      }
    });

  } catch (error) {
    console.error('获取日程计划错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新日程计划
 * @route PUT /api/schedules/:id
 * @access Private
 */
const updateSchedule = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updateData = req.body;

    const schedule = await Schedule.findOne({
      _id: id,
      user: userId
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: '日程计划不存在'
      });
    }

    // 更新允许的字段
    Object.keys(updateData).forEach(key => {
      if (['title', 'description', 'date', 'startTime', 'endTime', 'type', 'priority', 'status', 'tags'].includes(key)) {
        schedule[key] = updateData[key];
      }
    });

    await schedule.save();

    res.json({
      success: true,
      message: '日程计划更新成功',
      data: {
        schedule
      }
    });

  } catch (error) {
    console.error('更新日程计划错误:', error);

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
 * 删除日程计划
 * @route DELETE /api/schedules/:id
 * @access Private
 */
const deleteSchedule = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const schedule = await Schedule.findOneAndDelete({
      _id: id,
      user: userId
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: '日程计划不存在'
      });
    }

    res.json({
      success: true,
      message: '日程计划删除成功'
    });

  } catch (error) {
    console.error('删除日程计划错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule
};

