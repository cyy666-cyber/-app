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

### 下一步

注册成功后，可以：
1. 实现登录接口（使用 JWT）
2. 实现用户信息查询接口
3. 实现密码重置接口

