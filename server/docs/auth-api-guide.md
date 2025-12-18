# 用户认证 API 指南

## 用户注册接口

### 接口信息

- **URL**: `/api/auth/register`
- **方法**: `POST`
- **访问权限**: 公开（无需认证）

### 请求格式

#### Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "username": "string (必需, 3-20字符)",
  "email": "string (必需, 有效邮箱格式)",
  "password": "string (必需, 至少6个字符)",
  "school": "string (可选, 学校名称)"
}
```

### 请求示例

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "password": "password123",
    "school": "清华大学"
  }'
```

### 响应格式

#### 成功响应 (201 Created)

```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "school": "清华大学",
      "avatar": "",
      "createdAt": "2025-12-18T10:00:00.000Z",
      "stats": {
        "learningHours": 0,
        "completedPlans": 0,
        "forumPosts": 0,
        "teamCount": 0
      }
    }
  }
}
```

#### 错误响应

##### 1. 缺少必填字段 (400 Bad Request)

```json
{
  "success": false,
  "message": "请提供用户名、邮箱和密码",
  "errors": {
    "username": "用户名是必需的",
    "email": "邮箱是必需的",
    "password": "密码是必需的"
  }
}
```

##### 2. 用户名长度不符合要求 (400 Bad Request)

```json
{
  "success": false,
  "message": "用户名长度必须在3-20个字符之间"
}
```

##### 3. 邮箱格式无效 (400 Bad Request)

```json
{
  "success": false,
  "message": "请输入有效的邮箱地址"
}
```

##### 4. 密码长度不足 (400 Bad Request)

```json
{
  "success": false,
  "message": "密码至少需要6个字符"
}
```

##### 5. 用户名已存在 (409 Conflict)

```json
{
  "success": false,
  "message": "用户名已被使用",
  "field": "username"
}
```

##### 6. 邮箱已注册 (409 Conflict)

```json
{
  "success": false,
  "message": "邮箱已被注册",
  "field": "email"
}
```

##### 7. 服务器错误 (500 Internal Server Error)

```json
{
  "success": false,
  "message": "服务器错误，注册失败",
  "error": "错误详情（仅开发环境）"
}
```

### 字段验证规则

| 字段 | 类型 | 必填 | 长度限制 | 格式要求 | 说明 |
|------|------|------|----------|----------|------|
| username | String | ✅ | 3-20字符 | 字母、数字、下划线、中文 | 用户名，唯一 |
| email | String | ✅ | - | 有效邮箱格式 | 邮箱地址，唯一，自动转小写 |
| password | String | ✅ | 至少6字符 | - | 密码，保存时自动加密 |
| school | String | ❌ | - | - | 学校名称 |

### 密码加密

- 密码使用 **bcrypt** 加密
- 加密在 User 模型的 `pre('save')` hook 中自动执行
- 使用 10 轮 salt 加密
- 密码不会在响应中返回

### 安全特性

1. **密码加密**: 使用 bcrypt 自动加密
2. **输入验证**: 服务端验证所有输入
3. **唯一性检查**: 用户名和邮箱唯一性验证
4. **错误处理**: 详细的错误信息（开发环境）
5. **数据清理**: 邮箱自动转小写和去除空格

### 使用示例

#### JavaScript (Fetch)

```javascript
const registerUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const result = await response.json();

    if (result.success) {
      console.log('注册成功:', result.data.user);
      return result.data.user;
    } else {
      console.error('注册失败:', result.message);
      if (result.errors) {
        console.error('错误详情:', result.errors);
      }
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('请求错误:', error);
    throw error;
  }
};

// 使用
registerUser({
  username: 'zhangsan',
  email: 'zhangsan@example.com',
  password: 'password123',
  school: '清华大学'
});
```

#### Axios

```javascript
import axios from 'axios';

const registerUser = async (userData) => {
  try {
    const response = await axios.post(
      'http://localhost:3001/api/auth/register',
      userData
    );
    
    if (response.data.success) {
      return response.data.data.user;
    }
  } catch (error) {
    if (error.response) {
      // 服务器返回了错误响应
      console.error('注册失败:', error.response.data.message);
      if (error.response.data.errors) {
        console.error('错误详情:', error.response.data.errors);
      }
    } else {
      // 请求失败
      console.error('请求错误:', error.message);
    }
    throw error;
  }
};
```

### 注意事项

1. **密码安全**: 
   - 密码不会在响应中返回
   - 密码在数据库中加密存储
   - 建议前端也进行密码强度验证

2. **邮箱处理**:
   - 邮箱会自动转换为小写
   - 邮箱会自动去除前后空格

3. **用户名**:
   - 用户名唯一
   - 建议在前端检查用户名可用性

4. **错误处理**:
   - 开发环境会返回详细错误信息
   - 生产环境只返回通用错误信息

---

## 用户登录接口

### 接口信息

- **URL**: `/api/auth/login`
- **方法**: `POST`
- **访问权限**: 公开（无需认证）

### 请求格式

#### Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "string (必需, 注册时使用的邮箱)",
  "password": "string (必需, 用户密码)"
}
```

### 请求示例

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "zhangsan@example.com",
    "password": "password123"
  }'
```

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "school": "清华大学",
      "avatar": "",
      "stats": {
        "learningHours": 0,
        "completedPlans": 0,
        "forumPosts": 0,
        "teamCount": 0
      }
    }
  }
}
```

#### 错误响应

##### 1. 缺少必填字段 (400 Bad Request)

```json
{
  "success": false,
  "message": "请提供邮箱和密码",
  "errors": {
    "email": "邮箱是必需的",
    "password": "密码是必需的"
  }
}
```

##### 2. 邮箱或密码错误 (401 Unauthorized)

```json
{
  "success": false,
  "message": "邮箱或密码错误"
}
```

##### 3. 服务器错误 (500 Internal Server Error)

```json
{
  "success": false,
  "message": "服务器错误，登录失败",
  "error": "错误详情（仅开发环境）"
}
```

### 使用 Token

登录成功后，客户端应该：

1. **保存 Token**：将返回的 `token` 保存到本地存储（localStorage 或 sessionStorage）
2. **在请求头中使用**：后续需要认证的请求，在 `Authorization` 头中携带 token

#### 请求头格式

```
Authorization: Bearer <token>
```

### 使用示例

#### JavaScript (Fetch)

```javascript
const loginUser = async (email, password) => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success) {
      // 保存 token
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      
      console.log('登录成功:', result.data.user);
      return result.data;
    } else {
      console.error('登录失败:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('请求错误:', error);
    throw error;
  }
};

// 使用认证 token 的请求
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

#### Axios

```javascript
import axios from 'axios';

const loginUser = async (email, password) => {
  try {
    const response = await axios.post(
      'http://localhost:3001/api/auth/login',
      { email, password }
    );
    
    if (response.data.success) {
      // 保存 token
      localStorage.setItem('token', response.data.data.token);
      
      // 设置 axios 默认请求头
      axios.defaults.headers.common['Authorization'] = 
        `Bearer ${response.data.data.token}`;
      
      return response.data.data;
    }
  } catch (error) {
    if (error.response) {
      console.error('登录失败:', error.response.data.message);
    } else {
      console.error('请求错误:', error.message);
    }
    throw error;
  }
};
```

---

## 获取当前用户信息接口

### 接口信息

- **URL**: `/api/auth/me`
- **方法**: `GET`
- **访问权限**: 需要认证（Bearer Token）

### 请求格式

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### 请求示例

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 响应格式

#### 成功响应 (200 OK)

```json
{
  "success": true,
  "message": "获取用户信息成功",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "school": "清华大学",
      "avatar": "",
      "stats": {
        "learningHours": 0,
        "completedPlans": 0,
        "forumPosts": 0,
        "teamCount": 0
      }
    }
  }
}
```

#### 错误响应

##### 1. 未提供 Token (401 Unauthorized)

```json
{
  "success": false,
  "message": "未提供认证 token，请先登录"
}
```

##### 2. Token 无效或过期 (401 Unauthorized)

```json
{
  "success": false,
  "message": "Token 验证失败，请重新登录"
}
```

---

## JWT Token 说明

### Token 结构

JWT Token 由三部分组成，用 `.` 分隔：

```
header.payload.signature
```

### Token 载荷（Payload）

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "iat": 1234567890,
  "exp": 1234567890,
  "iss": "deepseek-app",
  "aud": "deepseek-app-users"
}
```

### Token 过期时间

- 默认过期时间：7 天
- 可通过环境变量 `JWT_EXPIRE` 配置
- 格式：数字 + 单位（如 `7d`, `24h`, `3600s`）

### Token 安全

1. **存储安全**：
   - 不要将 token 存储在 cookie 中（除非设置了 HttpOnly）
   - 建议使用 localStorage 或 sessionStorage
   - 生产环境考虑使用 httpOnly cookie

2. **传输安全**：
   - 始终使用 HTTPS
   - Token 在请求头中传输，不在 URL 中

3. **过期处理**：
   - Token 过期后需要重新登录
   - 可以实现 refresh token 机制（可选）

---

## 认证中间件

### 使用方式

在需要认证的路由中使用 `authenticate` 中间件：

```javascript
const { authenticate } = require('./middleware/auth');

// 受保护的路由
router.get('/profile', authenticate, async (req, res) => {
  // req.user 包含当前登录用户的信息
  res.json({ user: req.user });
});
```

### 可选认证

对于可选认证的路由（如：如果登录则显示个性化内容，否则显示默认内容）：

```javascript
const { optionalAuth } = require('./middleware/auth');

router.get('/posts', optionalAuth, async (req, res) => {
  // req.user 可能为 undefined（如果未登录）
  if (req.user) {
    // 显示个性化内容
  } else {
    // 显示默认内容
  }
});
```

---

## 下一步

认证系统已完成，可以：
1. 实现密码重置接口
2. 实现用户信息更新接口
3. 实现 token 刷新机制（可选）
4. 开始实现业务功能接口

