/**
 * 验证数据库模型完整性脚本
 * 检查所有模型是否正确配置
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const models = require('../models');

const validateModels = async () => {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();
    
    console.log('\n📋 开始验证模型...\n');
    
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };

    // 1. 检查所有模型是否可以加载
    console.log('1️⃣  检查模型加载...');
    const modelNames = Object.keys(models);
    results.total = modelNames.length;
    
    modelNames.forEach(name => {
      try {
        const Model = models[name];
        if (!Model) {
          throw new Error(`模型 ${name} 未定义`);
        }
        if (typeof Model.model !== 'function' && typeof Model !== 'function') {
          throw new Error(`模型 ${name} 不是有效的 Mongoose 模型`);
        }
        console.log(`  ✅ ${name}`);
        results.passed++;
      } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
        results.failed++;
        results.errors.push({ model: name, error: error.message });
      }
    });

    // 2. 检查模型关联关系
    console.log('\n2️⃣  检查模型关联关系...');
    const associations = [
      { model: 'User', refs: ['Schedule', 'SkillTree', 'KnowledgeBase', 'Forum', 'Post', 'Reply', 'Team'] },
      { model: 'Schedule', refs: ['User'] },
      { model: 'Post', refs: ['Forum', 'User', 'Reply'] },
      { model: 'Reply', refs: ['Post', 'User'] },
      { model: 'Forum', refs: ['User'] },
      { model: 'Team', refs: ['User'] },
      { model: 'TeamMessage', refs: ['Team', 'User'] },
      { model: 'Message', refs: ['User', 'KnowledgeBase'] },
      { model: 'KnowledgeBase', refs: ['User'] }
    ];

    for (const assoc of associations) {
      try {
        const Model = models[assoc.model];
        const schema = Model.schema;
        
        // 检查 ref 字段
        for (const refName of assoc.refs) {
          const paths = schema.paths;
          let found = false;
          
          for (const pathName in paths) {
            const path = paths[pathName];
            if (path.options && path.options.ref === refName) {
              found = true;
              break;
            }
            // 检查数组中的 ref
            if (path.schema && path.schema.paths) {
              for (const subPathName in path.schema.paths) {
                const subPath = path.schema.paths[subPathName];
                if (subPath.options && subPath.options.ref === refName) {
                  found = true;
                  break;
                }
              }
            }
          }
          
          if (!found) {
            console.log(`  ⚠️  ${assoc.model} -> ${refName}: 关联未找到（可能在其他字段中）`);
          }
        }
        console.log(`  ✅ ${assoc.model} 关联检查完成`);
      } catch (error) {
        console.log(`  ❌ ${assoc.model}: ${error.message}`);
        results.errors.push({ model: assoc.model, error: error.message });
      }
    }

    // 3. 检查索引配置
    console.log('\n3️⃣  检查索引配置...');
    const modelList = ['User', 'Schedule', 'Post', 'Forum', 'Team', 'Reply', 'KnowledgeBase', 'TeamMessage', 'Message'];
    
    for (const modelName of modelList) {
      try {
        const Model = models[modelName];
        const indexes = Model.schema.indexes();
        console.log(`  ✅ ${modelName}: ${indexes.length} 个索引`);
      } catch (error) {
        console.log(`  ❌ ${modelName}: ${error.message}`);
        results.errors.push({ model: modelName, error: error.message });
      }
    }

    // 4. 检查必填字段
    console.log('\n4️⃣  检查必填字段...');
    const requiredFields = {
      User: ['username', 'email', 'password'],
      Schedule: ['user', 'title', 'date', 'startTime', 'endTime'],
      Post: ['forum', 'author', 'title', 'content'],
      Forum: ['name', 'creator'],
      Team: ['name', 'leader'],
      Reply: ['post', 'author', 'content'],
      Message: ['user', 'role', 'content', 'sessionId'],
      KnowledgeBase: ['user', 'title', 'content'],
      TeamMessage: ['team', 'sender', 'content']
    };

    for (const [modelName, fields] of Object.entries(requiredFields)) {
      try {
        const Model = models[modelName];
        const schema = Model.schema;
        
        for (const field of fields) {
          const path = schema.path(field);
          if (!path) {
            console.log(`  ⚠️  ${modelName}.${field}: 字段不存在`);
          } else if (!path.isRequired) {
            console.log(`  ⚠️  ${modelName}.${field}: 字段不是必填的`);
          }
        }
        console.log(`  ✅ ${modelName} 必填字段检查完成`);
      } catch (error) {
        console.log(`  ❌ ${modelName}: ${error.message}`);
      }
    }

    // 5. 测试创建文档（不保存）
    console.log('\n5️⃣  测试模型验证...');
    try {
      // 测试 User 模型验证
      const testUser = new models.User({
        username: 'test',
        email: 'test@example.com',
        password: 'password123'
      });
      await testUser.validate();
      console.log('  ✅ User 模型验证通过');
    } catch (error) {
      console.log(`  ❌ User 模型验证失败: ${error.message}`);
    }

    // 6. 检查数据库连接状态
    console.log('\n6️⃣  检查数据库连接状态...');
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    console.log(`  状态: ${states[state]} (${state})`);
    
    if (state === 1) {
      console.log('  ✅ 数据库连接正常');
    } else {
      console.log('  ⚠️  数据库连接异常');
    }

    // 总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 验证结果总结');
    console.log('='.repeat(50));
    console.log(`总模型数: ${results.total}`);
    console.log(`通过: ${results.passed}`);
    console.log(`失败: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ 发现的错误:');
      results.errors.forEach(err => {
        console.log(`  - ${err.model}: ${err.error}`);
      });
    } else {
      console.log('\n✅ 所有检查通过！');
    }

    await mongoose.connection.close();
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ 验证过程出错:', error);
    process.exit(1);
  }
};

validateModels();

