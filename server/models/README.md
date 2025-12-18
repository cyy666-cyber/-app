# 数据模型文档

## 模型概览

本项目包含 10 个核心数据模型，用于支持大学生个性化学习与组队共创 App 的所有功能。

## 模型列表

### 1. User（用户模型）
**文件**: `User.js`

**字段**:
- **基本信息**: username, email, password, avatar, school
- **学习相关**: skillTree, learningPlans, knowledgeBase
- **社交相关**: joinedForums, teams, teamHistory
- **统计信息**: stats (learningHours, completedPlans, forumPosts, teamCount)

**关联**:
- → Schedule (learningPlans)
- → SkillTree (skillTree)
- → KnowledgeBase (knowledgeBase)
- → Forum (joinedForums)
- → Team (teams, teamHistory)

---

### 2. Schedule（日程计划模型）
**文件**: `Schedule.js`

**字段**:
- user, title, description, date, startTime, endTime
- type (study/exercise/project/meeting/other)
- priority (low/medium/high)
- status (pending/in-progress/completed/cancelled)
- tags, aiSuggested, aiReason

**关联**:
- ← User (user)

**索引**:
- { user: 1, date: 1 }
- { user: 1, status: 1 }

---

### 3. SkillTree / SkillNode（技能树模型）
**文件**: `SkillTree.js`

**SkillNode 字段**:
- name, description, level (0-100), category
- prerequisites, children (引用其他 SkillNode)
- resources, completed, completedAt

**SkillTree 字段**:
- user, rootNodes
- aiRecommendedPath (AI 推荐路径)
- totalSkills, completedSkills

**关联**:
- SkillTree ← User (user)
- SkillNode → SkillNode (prerequisites, children)

---

### 4. KnowledgeBase（知识库模型）
**文件**: `KnowledgeBase.js`

**字段**:
- user, title, content, category, tags
- source (type, sourceId, sourceText)
- aiSummary, aiKeywords
- importance (1-10)
- viewCount, lastViewedAt

**关联**:
- ← User (user)
- ← Message (sourceId)

**索引**:
- { user: 1, category: 1 }
- { title: 'text', content: 'text', tags: 'text' } (全文搜索)

---

### 5. Forum（论坛模型）
**文件**: `Forum.js`

**字段**:
- name, description, creator, category, tags
- members (user, joinedAt, role: member/moderator/admin)
- stats (postCount, memberCount, lastActivityAt)
- settings (isPublic, requireApproval, aiEnabled)

**关联**:
- ← User (creator, members.user)
- → Post (posts)

**索引**:
- { category: 1, createdAt: -1 }
- { 'members.user': 1 }
- { name: 'text', description: 'text' }

---

### 6. Post（帖子模型）
**文件**: `Post.js`

**字段**:
- forum, author, title, content, tags
- likes, favorites
- aiAnswers (AI 回答)
- replyCount, viewCount
- status (published/draft/deleted)
- isPinned

**关联**:
- ← Forum (forum)
- ← User (author)
- → Reply (replies)

**索引**:
- { forum: 1, createdAt: -1 }
- { author: 1, createdAt: -1 }
- { title: 'text', content: 'text' }
- { isPinned: -1, createdAt: -1 }

---

### 7. Reply（回复模型）
**文件**: `Reply.js`

**字段**:
- post, author, content
- parentReply (支持嵌套回复)
- likes
- aiSuggested
- status (published/deleted)

**关联**:
- ← Post (post)
- ← User (author)
- ← Reply (parentReply)

**索引**:
- { post: 1, createdAt: 1 }
- { author: 1, createdAt: -1 }
- { parentReply: 1 }

---

### 8. Team（组队模型）
**文件**: `Team.js`

**字段**:
- name, description, leader
- members (user, joinedAt, role: member/co-leader, status)
- goals (title, description, deadline, status)
- tags, category
- aiSuggested, aiReason
- settings (maxMembers, isPublic, requireApproval, aiEnabled)
- stats (messageCount, completedGoals, totalGoals, lastActivityAt)

**关联**:
- ← User (leader, members.user)
- → TeamMessage (messages)

**索引**:
- { leader: 1, createdAt: -1 }
- { 'members.user': 1 }
- { category: 1, createdAt: -1 }
- { name: 'text', description: 'text' }

---

### 9. TeamMessage（队伍消息模型）
**文件**: `TeamMessage.js`

**字段**:
- team, sender, content
- type (text/image/file/system/ai)
- isAI, aiContext
- fileUrl, fileName
- replyTo
- readBy (user, readAt)

**关联**:
- ← Team (team)
- ← User (sender)
- ← TeamMessage (replyTo)

**索引**:
- { team: 1, createdAt: -1 } (聊天室查询)
- { sender: 1, createdAt: -1 }
- { team: 1, type: 1 }

---

### 10. Message（AI聊天消息模型）
**文件**: `Message.js`

**字段**:
- user, role (user/assistant), content
- sessionId (会话ID)
- context (type, contextId)
- model, tokens (prompt, completion, total)
- addedToKnowledgeBase, knowledgeBaseId

**关联**:
- ← User (user)
- → KnowledgeBase (knowledgeBaseId)

**索引**:
- { user: 1, sessionId: 1, createdAt: 1 }
- { user: 1, createdAt: -1 }
- { sessionId: 1, createdAt: 1 }

---

## 模型关联关系图

```
User
├── Schedule (学习计划)
├── SkillTree (技能树)
├── KnowledgeBase (知识库)
├── Forum (创建的论坛)
├── Post (发布的帖子)
├── Reply (回复)
├── Team (创建的队伍)
└── Message (AI聊天记录)

Forum
└── Post
    └── Reply

Team
└── TeamMessage

Message
└── KnowledgeBase (整理后的知识)
```

## 使用方式

### 导入所有模型
```javascript
const { User, Schedule, Forum, Team } = require('./models');
```

### 导入单个模型
```javascript
const User = require('./models/User');
```

### 使用示例
```javascript
// 创建用户
const user = new User({
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  school: '示例大学'
});
await user.save();

// 查询并填充关联数据
const schedule = await Schedule.findOne({ user: user._id })
  .populate('user', 'username email');

// 使用索引查询
const recentPosts = await Post.find({ forum: forumId })
  .sort({ createdAt: -1 })
  .limit(10);
```

## 索引说明

所有模型都添加了适当的索引以优化查询性能：

- **用户相关查询**: 按 user + 时间排序
- **论坛相关查询**: 按 forum + 时间排序
- **全文搜索**: Post, Forum, Team 支持文本搜索
- **聊天消息**: TeamMessage 按 team + 时间排序（用于聊天室）

## AI 功能支持

以下模型包含 AI 相关字段：

- **Schedule**: aiSuggested, aiReason
- **KnowledgeBase**: aiSummary, aiKeywords
- **Post**: aiAnswers
- **Reply**: aiSuggested
- **Team**: aiSuggested, aiReason
- **TeamMessage**: isAI, aiContext
- **Message**: 完整的 AI 聊天记录

## 注意事项

1. **密码安全**: User 模型的密码字段默认不返回（select: false）
2. **时间戳**: 所有模型自动添加 createdAt 和 updatedAt
3. **数据验证**: 所有必填字段都有验证规则
4. **关联查询**: 使用 populate() 查询关联数据
5. **软删除**: 部分模型使用 status 字段标记删除而非真正删除

