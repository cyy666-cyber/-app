// 统一导出所有模型
const User = require('./User');
const Schedule = require('./Schedule');
const { SkillTree, SkillNode } = require('./SkillTree');
const KnowledgeBase = require('./KnowledgeBase');
const Forum = require('./Forum');
const Post = require('./Post');
const Reply = require('./Reply');
const Team = require('./Team');
const TeamMessage = require('./TeamMessage');
const Message = require('./Message');

module.exports = {
  User,
  Schedule,
  SkillTree,
  SkillNode,
  KnowledgeBase,
  Forum,
  Post,
  Reply,
  Team,
  TeamMessage,
  Message
};

