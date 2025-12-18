/**
 * 技能树控制器
 * 处理技能树的 CRUD 操作和技能节点的管理
 */

const { SkillTree, SkillNode } = require('../models/SkillTree');
const User = require('../models/User');

/**
 * 创建或获取用户的技能树
 * @route GET /api/skill-tree
 * @access Private
 */
const getSkillTree = async (req, res) => {
  try {
    const userId = req.userId;

    // 查找或创建技能树
    let skillTree = await SkillTree.findOne({ user: userId })
      .populate('rootNodes');

    if (!skillTree) {
      // 创建新的技能树
      skillTree = new SkillTree({
        user: userId,
        rootNodes: []
      });
      await skillTree.save();

      // 更新用户的技能树引用
      await User.findByIdAndUpdate(userId, { skillTree: skillTree._id });
    }

    // 填充所有技能节点
    const rootNodes = await SkillNode.find({ _id: { $in: skillTree.rootNodes } })
      .populate('prerequisites')
      .populate('children');

    res.json({
      success: true,
      message: '获取技能树成功',
      data: {
        skillTree: {
          ...skillTree.toObject(),
          rootNodes
        }
      }
    });

  } catch (error) {
    console.error('获取技能树错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 创建技能节点
 * @route POST /api/skill-tree/nodes
 * @access Private
 */
const createSkillNode = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, category, level, prerequisites, children, resources } = req.body;

    // 输入验证
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: '请提供技能名称和分类'
      });
    }

    // 创建技能节点
    const skillNode = new SkillNode({
      name,
      description: description || '',
      category,
      level: level || 0,
      prerequisites: prerequisites || [],
      children: children || [],
      resources: resources || []
    });

    await skillNode.save();

    // 获取用户的技能树
    let skillTree = await SkillTree.findOne({ user: userId });
    if (!skillTree) {
      skillTree = new SkillTree({
        user: userId,
        rootNodes: []
      });
      await skillTree.save();
      await User.findByIdAndUpdate(userId, { skillTree: skillTree._id });
    }

    // 如果没有父节点，添加到根节点
    if (!prerequisites || prerequisites.length === 0) {
      skillTree.rootNodes.push(skillNode._id);
      skillTree.totalSkills += 1;
      await skillTree.save();
    }

    res.status(201).json({
      success: true,
      message: '技能节点创建成功',
      data: {
        skillNode
      }
    });

  } catch (error) {
    console.error('创建技能节点错误:', error);

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
 * 获取技能节点列表
 * @route GET /api/skill-tree/nodes
 * @access Private
 */
const getSkillNodes = async (req, res) => {
  try {
    const userId = req.userId;
    const { category, completed } = req.query;

    // 获取用户的技能树
    const skillTree = await SkillTree.findOne({ user: userId });
    if (!skillTree) {
      return res.json({
        success: true,
        message: '获取技能节点列表成功',
        data: {
          nodes: [],
          total: 0
        }
      });
    }

    // 构建查询条件
    const filter = {};
    if (category) filter.category = category;
    if (completed !== undefined) filter.completed = completed === 'true';

    // 获取所有技能节点（通过 rootNodes 递归查找）
    const allNodeIds = new Set();
    const findChildren = async (nodeIds) => {
      for (const nodeId of nodeIds) {
        if (!allNodeIds.has(nodeId.toString())) {
          allNodeIds.add(nodeId.toString());
          const node = await SkillNode.findById(nodeId);
          if (node && node.children && node.children.length > 0) {
            await findChildren(node.children);
          }
        }
      }
    };

    await findChildren(skillTree.rootNodes);

    // 查询节点
    const nodes = await SkillNode.find({
      _id: { $in: Array.from(allNodeIds) },
      ...filter
    })
      .populate('prerequisites', 'name category level')
      .populate('children', 'name category level completed')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: '获取技能节点列表成功',
      data: {
        nodes,
        total: nodes.length
      }
    });

  } catch (error) {
    console.error('获取技能节点列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取单个技能节点
 * @route GET /api/skill-tree/nodes/:id
 * @access Private
 */
const getSkillNode = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // 验证节点是否属于用户的技能树
    const skillTree = await SkillTree.findOne({ user: userId });
    if (!skillTree) {
      return res.status(404).json({
        success: false,
        message: '技能树不存在'
      });
    }

    const skillNode = await SkillNode.findById(id)
      .populate('prerequisites')
      .populate('children');

    if (!skillNode) {
      return res.status(404).json({
        success: false,
        message: '技能节点不存在'
      });
    }

    res.json({
      success: true,
      message: '获取技能节点成功',
      data: {
        skillNode
      }
    });

  } catch (error) {
    console.error('获取技能节点错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新技能节点
 * @route PUT /api/skill-tree/nodes/:id
 * @access Private
 */
const updateSkillNode = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updateData = req.body;

    // 验证节点是否属于用户的技能树
    const skillTree = await SkillTree.findOne({ user: userId });
    if (!skillTree) {
      return res.status(404).json({
        success: false,
        message: '技能树不存在'
      });
    }

    const skillNode = await SkillNode.findById(id);
    if (!skillNode) {
      return res.status(404).json({
        success: false,
        message: '技能节点不存在'
      });
    }

    // 更新允许的字段
    const allowedFields = ['name', 'description', 'category', 'level', 'prerequisites', 'children', 'resources', 'completed'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        skillNode[field] = updateData[field];
      }
    });

    // 如果标记为完成，设置完成时间
    if (updateData.completed === true && !skillNode.completed) {
      skillNode.completedAt = new Date();
      
      // 更新技能树统计
      if (skillTree) {
        skillTree.completedSkills += 1;
        await skillTree.save();
      }
    } else if (updateData.completed === false && skillNode.completed) {
      skillNode.completedAt = null;
      
      // 更新技能树统计
      if (skillTree) {
        skillTree.completedSkills = Math.max(0, skillTree.completedSkills - 1);
        await skillTree.save();
      }
    }

    await skillNode.save();

    res.json({
      success: true,
      message: '技能节点更新成功',
      data: {
        skillNode
      }
    });

  } catch (error) {
    console.error('更新技能节点错误:', error);

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
 * 删除技能节点
 * @route DELETE /api/skill-tree/nodes/:id
 * @access Private
 */
const deleteSkillNode = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // 验证节点是否属于用户的技能树
    const skillTree = await SkillTree.findOne({ user: userId });
    if (!skillTree) {
      return res.status(404).json({
        success: false,
        message: '技能树不存在'
      });
    }

    const skillNode = await SkillNode.findById(id);
    if (!skillNode) {
      return res.status(404).json({
        success: false,
        message: '技能节点不存在'
      });
    }

    // 检查是否有子节点
    if (skillNode.children && skillNode.children.length > 0) {
      return res.status(400).json({
        success: false,
        message: '无法删除有子节点的技能节点，请先删除子节点'
      });
    }

    // 从父节点的 children 中移除
    await SkillNode.updateMany(
      { children: id },
      { $pull: { children: id } }
    );

    // 从根节点中移除
    if (skillTree.rootNodes.includes(id)) {
      skillTree.rootNodes = skillTree.rootNodes.filter(
        nodeId => nodeId.toString() !== id.toString()
      );
      skillTree.totalSkills = Math.max(0, skillTree.totalSkills - 1);
      if (skillNode.completed) {
        skillTree.completedSkills = Math.max(0, skillTree.completedSkills - 1);
      }
      await skillTree.save();
    }

    // 删除节点
    await SkillNode.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '技能节点删除成功'
    });

  } catch (error) {
    console.error('删除技能节点错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，删除失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 添加技能节点关系
 * @route POST /api/skill-tree/nodes/:id/prerequisites
 * @access Private
 */
const addPrerequisite = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { prerequisiteId } = req.body;

    if (!prerequisiteId) {
      return res.status(400).json({
        success: false,
        message: '请提供前置技能节点 ID'
      });
    }

    const skillNode = await SkillNode.findById(id);
    const prerequisite = await SkillNode.findById(prerequisiteId);

    if (!skillNode || !prerequisite) {
      return res.status(404).json({
        success: false,
        message: '技能节点不存在'
      });
    }

    // 检查是否已存在
    if (skillNode.prerequisites.includes(prerequisiteId)) {
      return res.status(400).json({
        success: false,
        message: '前置技能已存在'
      });
    }

    skillNode.prerequisites.push(prerequisiteId);
    await skillNode.save();

    res.json({
      success: true,
      message: '前置技能添加成功',
      data: {
        skillNode
      }
    });

  } catch (error) {
    console.error('添加前置技能错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 添加子技能节点
 * @route POST /api/skill-tree/nodes/:id/children
 * @access Private
 */
const addChild = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { childId } = req.body;

    if (!childId) {
      return res.status(400).json({
        success: false,
        message: '请提供子技能节点 ID'
      });
    }

    const skillNode = await SkillNode.findById(id);
    const child = await SkillNode.findById(childId);

    if (!skillNode || !child) {
      return res.status(404).json({
        success: false,
        message: '技能节点不存在'
      });
    }

    // 检查是否已存在
    if (skillNode.children.includes(childId)) {
      return res.status(400).json({
        success: false,
        message: '子技能已存在'
      });
    }

    skillNode.children.push(childId);
    await skillNode.save();

    res.json({
      success: true,
      message: '子技能添加成功',
      data: {
        skillNode
      }
    });

  } catch (error) {
    console.error('添加子技能错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取技能树统计信息
 * @route GET /api/skill-tree/stats
 * @access Private
 */
const getSkillTreeStats = async (req, res) => {
  try {
    const userId = req.userId;

    const skillTree = await SkillTree.findOne({ user: userId });
    if (!skillTree) {
      return res.json({
        success: true,
        message: '获取统计信息成功',
        data: {
          totalSkills: 0,
          completedSkills: 0,
          completionRate: 0,
          categories: {}
        }
      });
    }

    // 获取所有节点
    const allNodeIds = new Set();
    const findChildren = async (nodeIds) => {
      for (const nodeId of nodeIds) {
        if (!allNodeIds.has(nodeId.toString())) {
          allNodeIds.add(nodeId.toString());
          const node = await SkillNode.findById(nodeId);
          if (node && node.children && node.children.length > 0) {
            await findChildren(node.children);
          }
        }
      }
    };

    await findChildren(skillTree.rootNodes);

    const nodes = await SkillNode.find({
      _id: { $in: Array.from(allNodeIds) }
    });

    // 按分类统计
    const categories = {};
    nodes.forEach(node => {
      if (!categories[node.category]) {
        categories[node.category] = {
          total: 0,
          completed: 0
        };
      }
      categories[node.category].total += 1;
      if (node.completed) {
        categories[node.category].completed += 1;
      }
    });

    const completionRate = skillTree.totalSkills > 0
      ? ((skillTree.completedSkills / skillTree.totalSkills) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      message: '获取统计信息成功',
      data: {
        totalSkills: skillTree.totalSkills,
        completedSkills: skillTree.completedSkills,
        completionRate: parseFloat(completionRate),
        categories
      }
    });

  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSkillTree,
  createSkillNode,
  getSkillNodes,
  getSkillNode,
  updateSkillNode,
  deleteSkillNode,
  addPrerequisite,
  addChild,
  getSkillTreeStats
};

