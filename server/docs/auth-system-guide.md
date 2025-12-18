# 用户认证系统完整指南

## 概述

本系统支持三种登录方式：
1. **邮箱 + 密码**（传统方式）
2. **手机号 + 验证码**（快速登录）
3. **微信登录**（第三方登录）

所有用户都需要进行**学校认证**，以便在各自的学校圈子内活动。

## 认证接口列表

### 1. 邮箱注册/登录

#### 注册
- **POST** `/api/auth/register`
- **请求体**:
```json
{
  "username": "用户名（3-20字符）",
  "email": "邮箱地址",
  "password": "密码（至少6字符）",
  "school": "学校名称（可选）"
}
```

#### 登录
- **POST** `/api/auth/login`
- **请求体**:
```json
{
  "email": "邮箱地址",
  "password": "密码"
}
```

### 2. 手机号登录/注册

#### 发送验证码
- **POST** `/api/auth/phone/send-code`
- **请求体**:
```json
{
  "phone": "手机号（11位）"
}
```

**响应**（开发环境）:
```json
{
  "success": true,
  "message": "验证码已发送",
  "code": "123456",  // 仅开发环境返回
  "expiresIn": 300   // 5分钟
}
```

#### 验证码登录/注册
- **POST** `/api/auth/phone/login`
- **请求体**:
```json
{
  "phone": "手机号",
  "code": "验证码",
  "username": "用户名（新用户必填）",
  "school": "学校名称（可选）"
}
```

### 3. 微信登录/注册

- **POST** `/api/auth/wechat/login`
- **请求体**:
```json
{
  "code": "微信登录 code",
  "nickname": "微信昵称（可选）",
  "avatar": "微信头像 URL（可选）",
  "school": "学校名称（可选）"
}
```

### 4. 学校认证

#### 提交认证申请
- **POST** `/api/auth/school/verify`
- **需要认证**: ✅
- **请求体**:
```json
{
  "studentId": "学号",
  "verificationMethod": "email|student_card|manual",
  "verificationProof": "证明材料 URL（可选）"
}
```

#### 获取认证状态
- **GET** `/api/auth/school/verify`
- **需要认证**: ✅

**响应**:
```json
{
  "success": true,
  "data": {
    "schoolVerified": false,
    "school": "清华大学",
    "verification": {
      "studentId": "2021001",
      "verificationMethod": "email",
      "verificationStatus": "pending",
      "verificationProof": null,
      "verifiedAt": null,
      "verifiedBy": null
    }
  }
}
```

## User 模型字段说明

### 登录相关字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | String | ✅ | 用户名（唯一） |
| email | String | 条件必填 | 邮箱（邮箱登录必填） |
| phone | String | 条件必填 | 手机号（手机号登录必填） |
| password | String | 条件必填 | 密码（邮箱登录必填，微信登录不需要） |
| wechatOpenId | String | 条件必填 | 微信 OpenID（微信登录必填） |

**注意**: 至少需要提供 `email`、`phone`、`wechatOpenId` 中的一种。

### 微信相关字段

| 字段 | 类型 | 说明 |
|------|------|------|
| wechatOpenId | String | 微信 OpenID（唯一） |
| wechatUnionId | String | 微信 UnionID（多应用统一用户） |
| wechatNickname | String | 微信昵称 |
| wechatAvatar | String | 微信头像 URL |

### 学校认证字段

| 字段 | 类型 | 说明 |
|------|------|------|
| school | String | 学校名称 |
| schoolVerified | Boolean | 是否已认证学校 |
| schoolVerification | Object | 认证详细信息 |
| - studentId | String | 学号 |
| - verificationMethod | String | 认证方式（email/student_card/manual） |
| - verificationStatus | String | 认证状态（pending/approved/rejected） |
| - verificationProof | String | 证明材料 URL |
| - verifiedAt | Date | 认证通过时间 |
| - verifiedBy | ObjectId | 审核人员 ID |

## 认证流程

### 1. 邮箱注册/登录流程

```
用户注册 → 输入邮箱密码 → 系统验证 → 创建用户 → 返回 Token
用户登录 → 输入邮箱密码 → 验证密码 → 返回 Token
```

### 2. 手机号登录流程

```
发送验证码 → 输入手机号 → 系统发送验证码 → 用户输入验证码
验证码登录 → 输入手机号+验证码 → 验证 → 创建/登录用户 → 返回 Token
```

### 3. 微信登录流程

```
微信授权 → 获取 code → 调用后端接口 → 后端获取 OpenID → 创建/登录用户 → 返回 Token
```

### 4. 学校认证流程

```
设置学校 → 提交认证申请 → 填写学号等信息 → 等待审核 → 审核通过 → 认证完成
```

## 学校圈子功能

### 按学校查询用户

```javascript
// 查询同校用户
const sameSchoolUsers = await User.find({ 
  school: '清华大学',
  schoolVerified: true 
});
```

### 学校排行榜

```javascript
// 按学校的学习排行榜
const leaderboard = await User.find({ 
  school: '清华大学' 
})
.sort({ 'stats.learningHours': -1 })
.limit(10);
```

## 环境变量配置

在 `server/.env` 中配置：

```env
# 微信登录配置
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret

# 短信服务配置（可选，开发环境会模拟）
SMS_API_URL=https://your-sms-api.com
SMS_API_KEY=your_sms_api_key
```

## 开发环境说明

### 短信验证码
- 开发环境：验证码会打印在控制台，无需真实发送
- 生产环境：需要配置真实的短信服务

### 微信登录
- 开发环境：可以模拟微信登录（使用 mock_openid）
- 生产环境：需要配置真实的微信 AppID 和 Secret

## 测试

运行认证流程测试：

```bash
# 基础认证测试
node scripts/testAuth.js

# 完整认证流程测试（包括手机号、微信、学校认证）
node scripts/testAuthFlow.js
```

## 安全注意事项

1. **密码安全**: 密码使用 bcrypt 加密，不会在响应中返回
2. **验证码安全**: 验证码有效期5分钟，应该使用 Redis 存储
3. **Token 安全**: JWT Token 有过期时间，建议使用 HTTPS
4. **学校认证**: 需要审核机制，防止虚假认证

## 后续优化建议

1. **验证码存储**: 使用 Redis 存储验证码，支持分布式部署
2. **短信服务**: 接入真实的短信服务商（阿里云、腾讯云等）
3. **微信登录**: 完善微信登录流程，支持小程序和 H5
4. **学校认证**: 实现自动审核（如邮箱域名验证）
5. **登录日志**: 记录登录历史，增强安全性

