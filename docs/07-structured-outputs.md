---
layout: default
title: 07. 结构化输出
nav_order: 9
---

# 结构化输出

## 概述

结构化输出（Structured Outputs）让 Agent 返回符合预定义 Schema 的 JSON 数据，而不是自由文本。这在以下场景中非常有用：
- 数据提取和解析
- API 集成
- 自动化工作流
- 类型安全的数据处理

SDK 支持两种方式定义 Schema：
1. **JSON Schema** - 标准的 JSON Schema 格式
2. **Zod Schema** - 使用 Zod 库，提供类型推断

## 工作原理

```
┌──────────────────────────────────────────────────────────┐
│                  结构化输出流程                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  定义 Schema                                              │
│  ↓                                                       │
│  发送查询 + outputFormat                                  │
│  ↓                                                       │
│  Agent 执行任务                                           │
│  ↓                                                       │
│  Agent 生成符合 Schema 的 JSON                            │
│  ↓                                                       │
│  SDK 验证数据                                             │
│  ↓                                                       │
│  返回 structured_output 字段                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 基本配置

```typescript
options: {
    outputFormat: {
        type: 'json_schema',
        schema: yourSchema  // JSON Schema 对象
    }
}
```

## 示例 1：使用 JSON Schema

**文件：** `examples/13-structured-output-query-company.ts`

```typescript
import { query } from '../lib/setup.js';

// 定义数据结构
const schema = {
    type: 'object',
    properties: {
        company_name: { type: 'string' },
        founded_year: { type: 'number' },
        headquarters: { type: 'string' }
    },
    required: ['company_name']
};

for await (const message of query({
    prompt: 'Research Anthropic and provide key company information',
    options: {
        allowedTools: ['WebFetch'],
        outputFormat: {
            type: 'json_schema',
            schema: schema
        }
    }
})) {
    // 结果消息包含 structured_output 字段
    if (message.type === 'result' && message.structured_output) {
        console.log(message.structured_output);
        // { company_name: "Anthropic", founded_year: 2021, headquarters: "San Francisco, CA" }
    }
}
```

**代码解析：**

1. **Schema 定义**：
   ```typescript
   const schema = {
       type: 'object',           // 根类型是对象
       properties: {             // 定义属性
           company_name: { type: 'string' },
           founded_year: { type: 'number' },
           headquarters: { type: 'string' }
       },
       required: ['company_name']  // 必需字段
   };
   ```

2. **结构化输出配置**：
   ```typescript
   options: {
       outputFormat: {
           type: 'json_schema',  // 使用 JSON Schema
           schema: schema        // 传入 Schema
       }
   }
   ```

3. **获取结果**：
   ```typescript
   if (message.type === 'result' && message.structured_output) {
       // structured_output 是验证后的 JSON 对象
       console.log(message.structured_output);
   }
   ```

## 示例 2：使用 Zod Schema

**文件：** `examples/14-structured-output-by-zod.ts`

```typescript
import { z } from 'zod';
import { query } from '../lib/setup.js';
import { dereferenceAndClean } from '../lib/utils.js';

// 使用 Zod 定义 Schema
const FeaturePlan = z.object({
    feature_name: z.string(),
    summary: z.string(),
    steps: z.array(
        z.object({
            step_number: z.number(),
            description: z.string(),
            estimated_complexity: z.enum(['low', 'medium', 'high'])
        })
    ),
    risks: z.array(z.string())
});

// 推断 TypeScript 类型
type FeaturePlan = z.infer<typeof FeaturePlan>;

// 转换为 JSON Schema 并清理
const schemaToUse = await dereferenceAndClean(z.toJSONSchema(FeaturePlan));

for await (const message of query({
    prompt: 'Provide a detailed specification for implementing user authentication in a web application. Include the feature name, summary, implementation steps with complexity levels, and potential risks. Format the response as structured data.',
    options: {
        outputFormat: {
            type: 'json_schema',
            schema: schemaToUse
        }
    }
})) {
    if (message.type === 'result' && message.structured_output) {
        console.log(message.structured_output);
        // 类型安全的 FeaturePlan 对象
    }
}
```

**代码解析：**

1. **Zod Schema 定义**：
   ```typescript
   const FeaturePlan = z.object({
       feature_name: z.string(),
       summary: z.string(),
       steps: z.array(
           z.object({
               step_number: z.number(),
               description: z.string(),
               estimated_complexity: z.enum(['low', 'medium', 'high'])
           })
       ),
       risks: z.array(z.string())
   });
   ```

2. **类型推断**：
   ```typescript
   type FeaturePlan = z.infer<typeof FeaturePlan>;
   ```
   自动生成 TypeScript 类型，提供编译时类型检查。

3. **转换和清理**：
   ```typescript
   const schemaToUse = await dereferenceAndClean(z.toJSONSchema(FeaturePlan));
   ```
   - `z.toJSONSchema()`: 将 Zod Schema 转换为 JSON Schema
   - `dereferenceAndClean()`: 解引用和清理 Schema（移除不必要的字段）

## 示例 3：实战 - TODO 追踪

**文件：** `examples/15-structured-output-todo-tracking.ts`

```typescript
import { query } from '../lib/setup.js';

// 定义 TODO 数据结构
const todoSchema = {
    type: 'object',
    properties: {
        todos: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    text: { type: 'string' },
                    file: { type: 'string' },
                    line: { type: 'number' },
                    author: { type: 'string' },
                    date: { type: 'string' }
                },
                required: ['text', 'file', 'line']
            }
        },
        total_count: { type: 'number' }
    },
    required: ['todos', 'total_count']
};

// Agent 使用 Grep 查找 TODO，使用 Bash 获取 git blame 信息
for await (const message of query({
    prompt: 'Find all TODO comments in this codebase and identify who added them',
    options: {
        outputFormat: {
            type: 'json_schema',
            schema: todoSchema
        }
    }
})) {
    if (message.type === 'result' && message.structured_output) {
        const data = message.structured_output;
        console.log(`Found ${data.total_count} TODOs`);

        data.todos.forEach(todo => {
            console.log(`${todo.file}:${todo.line} - ${todo.text}`);
            if (todo.author) {
                console.log(`  Added by ${todo.author} on ${todo.date}`);
            }
        });
    }
}
```

**代码解析：**

1. **嵌套 Schema**：
   ```typescript
   todos: {
       type: 'array',       // 数组类型
       items: {             // 数组元素的 Schema
           type: 'object',
           properties: {
               text: { type: 'string' },
               file: { type: 'string' },
               line: { type: 'number' },
               // ...
           }
       }
   }
   ```

2. **Agent 自动使用工具**：
   - 使用 `Grep` 搜索 TODO 注释
   - 使用 `Bash` 运行 `git blame` 获取作者信息
   - 将结果格式化为符合 Schema 的 JSON

3. **类型安全访问**：
   ```typescript
   data.todos.forEach(todo => {
       // todo.text, todo.file, todo.line 都是类型安全的
   });
   ```

## JSON Schema 完整指南

### 基本类型

```typescript
// 字符串
{ type: 'string' }

// 数字
{ type: 'number' }

// 布尔值
{ type: 'boolean' }

// 数组
{
    type: 'array',
    items: { type: 'string' }  // 元素类型
}

// 对象
{
    type: 'object',
    properties: {
        name: { type: 'string' },
        age: { type: 'number' }
    }
}
```

### 高级特性

#### 1. 必需字段

```typescript
{
    type: 'object',
    properties: {
        name: { type: 'string' },
        email: { type: 'string' }
    },
    required: ['name']  // name 是必需的，email 可选
}
```

#### 2. 枚举值

```typescript
{
    type: 'string',
    enum: ['pending', 'approved', 'rejected']
}
```

#### 3. 数组约束

```typescript
{
    type: 'array',
    items: { type: 'number' },
    minItems: 1,       // 最少 1 个元素
    maxItems: 10,      // 最多 10 个元素
    uniqueItems: true  // 元素唯一
}
```

#### 4. 字符串约束

```typescript
{
    type: 'string',
    minLength: 3,
    maxLength: 50,
    pattern: '^[A-Za-z]+$'  // 正则表达式
}
```

#### 5. 数字约束

```typescript
{
    type: 'number',
    minimum: 0,
    maximum: 100,
    multipleOf: 5  // 必须是 5 的倍数
}
```

#### 6. 嵌套对象

```typescript
{
    type: 'object',
    properties: {
        user: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                address: {
                    type: 'object',
                    properties: {
                        street: { type: 'string' },
                        city: { type: 'string' }
                    }
                }
            }
        }
    }
}
```

#### 7. 联合类型（anyOf）

```typescript
{
    anyOf: [
        { type: 'string' },
        { type: 'number' }
    ]
}
```

## Zod Schema 完整指南

### 基本类型

```typescript
import { z } from 'zod';

// 字符串
z.string()

// 数字
z.number()

// 布尔值
z.boolean()

// 数组
z.array(z.string())

// 对象
z.object({
    name: z.string(),
    age: z.number()
})
```

### 高级特性

#### 1. 可选字段

```typescript
const User = z.object({
    name: z.string(),
    email: z.string().optional(),  // 可选
    age: z.number().nullable()     // 可以是 null
});
```

#### 2. 默认值

```typescript
const Config = z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost')
});
```

#### 3. 枚举

```typescript
const Status = z.enum(['pending', 'approved', 'rejected']);
```

#### 4. 字符串验证

```typescript
const Email = z.string()
    .email()              // 邮箱格式
    .min(5)               // 最小长度
    .max(100)             // 最大长度
    .regex(/^[a-z]+$/);   // 正则表达式
```

#### 5. 数字验证

```typescript
const Age = z.number()
    .int()           // 整数
    .positive()      // 正数
    .min(0)          // 最小值
    .max(120);       // 最大值
```

#### 6. 数组验证

```typescript
const Tags = z.array(z.string())
    .min(1)          // 最少 1 个元素
    .max(10)         // 最多 10 个元素
    .nonempty();     // 不能为空
```

#### 7. 嵌套对象

```typescript
const Address = z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string()
});

const User = z.object({
    name: z.string(),
    address: Address  // 嵌套 Schema
});
```

#### 8. 联合类型

```typescript
const StringOrNumber = z.union([z.string(), z.number()]);
```

#### 9. 自定义验证

```typescript
const Password = z.string().refine(
    (val) => val.length >= 8 && /[A-Z]/.test(val),
    { message: "Password must be at least 8 chars and contain uppercase" }
);
```

## 实战场景

### 场景 1：数据提取

从文档中提取结构化信息：

```typescript
const ArticleSchema = z.object({
    title: z.string(),
    author: z.string(),
    published_date: z.string(),
    tags: z.array(z.string()),
    summary: z.string(),
    word_count: z.number()
});

const schema = await dereferenceAndClean(z.toJSONSchema(ArticleSchema));

for await (const message of query({
    prompt: 'Read the article.md file and extract key information',
    options: {
        outputFormat: {
            type: 'json_schema',
            schema: schema
        }
    }
})) {
    if (message.type === 'result' && message.structured_output) {
        const article = message.structured_output as z.infer<typeof ArticleSchema>;
        console.log(`Title: ${article.title}`);
        console.log(`Author: ${article.author}`);
        console.log(`Tags: ${article.tags.join(', ')}`);
    }
}
```

### 场景 2：API 响应格式化

生成符合 API 规范的响应：

```typescript
const APIResponse = z.object({
    status: z.enum(['success', 'error']),
    data: z.object({
        users: z.array(
            z.object({
                id: z.number(),
                username: z.string(),
                email: z.string().email(),
                role: z.enum(['admin', 'user', 'guest'])
            })
        )
    }),
    metadata: z.object({
        total: z.number(),
        page: z.number(),
        per_page: z.number()
    })
});

const schema = await dereferenceAndClean(z.toJSONSchema(APIResponse));

for await (const message of query({
    prompt: 'Query the database and format the user list as an API response',
    options: {
        outputFormat: {
            type: 'json_schema',
            schema: schema
        }
    }
})) {
    if (message.type === 'result' && message.structured_output) {
        // 可以直接作为 API 响应返回
        return message.structured_output;
    }
}
```

### 场景 3：配置文件生成

生成符合规范的配置文件：

```typescript
const ConfigSchema = z.object({
    server: z.object({
        host: z.string().default('localhost'),
        port: z.number().int().positive(),
        ssl: z.boolean()
    }),
    database: z.object({
        type: z.enum(['mysql', 'postgres', 'mongodb']),
        host: z.string(),
        port: z.number(),
        name: z.string(),
        credentials: z.object({
            username: z.string(),
            password: z.string()
        })
    }),
    logging: z.object({
        level: z.enum(['debug', 'info', 'warn', 'error']),
        output: z.enum(['console', 'file', 'both'])
    })
});

const schema = await dereferenceAndClean(z.toJSONSchema(ConfigSchema));

for await (const message of query({
    prompt: 'Generate a production-ready configuration for a Node.js web application',
    options: {
        outputFormat: {
            type: 'json_schema',
            schema: schema
        }
    }
})) {
    if (message.type === 'result' && message.structured_output) {
        const config = message.structured_output;
        // 写入配置文件
        fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    }
}
```

### 场景 4：测试数据生成

生成符合规范的测试数据：

```typescript
const TestDataSchema = z.object({
    users: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            email: z.string().email(),
            age: z.number().int().min(18).max(100)
        })
    ).min(10).max(50),  // 生成 10-50 个用户
    posts: z.array(
        z.object({
            id: z.number(),
            user_id: z.number(),
            title: z.string(),
            content: z.string(),
            created_at: z.string()
        })
    )
});

const schema = await dereferenceAndClean(z.toJSONSchema(TestDataSchema));

for await (const message of query({
    prompt: 'Generate realistic test data for a social media application',
    options: {
        outputFormat: {
            type: 'json_schema',
            schema: schema
        }
    }
})) {
    if (message.type === 'result' && message.structured_output) {
        const testData = message.structured_output;
        // 用于测试
        await seedDatabase(testData);
    }
}
```

## 最佳实践

### 1. 清晰的 Schema 命名

```typescript
// ✅ 好的做法
const UserProfile = z.object({
    full_name: z.string(),
    email_address: z.string().email()
});

// ❌ 避免
const Data = z.object({
    n: z.string(),
    e: z.string()
});
```

### 2. 使用类型推断

```typescript
// ✅ 好的做法
const User = z.object({
    name: z.string(),
    age: z.number()
});
type User = z.infer<typeof User>;  // 自动推断类型

// ❌ 避免
interface User {
    name: string;
    age: number;
}
```

### 3. 验证约束

添加合理的验证：

```typescript
const User = z.object({
    username: z.string().min(3).max(20),  // 用户名长度
    age: z.number().int().positive().max(150),  // 年龄范围
    email: z.string().email()  // 邮箱格式
});
```

### 4. 文档化 Schema

添加描述信息：

```typescript
const User = z.object({
    name: z.string().describe('用户的全名'),
    email: z.string().email().describe('联系邮箱'),
    role: z.enum(['admin', 'user']).describe('用户角色')
});
```

### 5. 复用 Schema

```typescript
// 定义可复用的 Schema
const Address = z.object({
    street: z.string(),
    city: z.string(),
    country: z.string()
});

const User = z.object({
    name: z.string(),
    home_address: Address,     // 复用
    work_address: Address      // 复用
});
```

## 错误处理

### 验证失败

如果 Agent 返回的数据不符合 Schema，SDK 会抛出错误：

```typescript
try {
    for await (const message of query({
        prompt: 'Extract user data',
        options: {
            outputFormat: {
                type: 'json_schema',
                schema: userSchema
            }
        }
    })) {
        if (message.type === 'result' && message.structured_output) {
            // 处理数据
        }
    }
} catch (error) {
    console.error('Schema validation failed:', error);
    // 处理验证错误
}
```

### 宽松模式

允许额外字段：

```typescript
const schema = {
    type: 'object',
    properties: {
        name: { type: 'string' }
    },
    additionalProperties: true  // 允许额外字段
};
```

## JSON Schema vs Zod

| 特性 | JSON Schema | Zod |
|------|-------------|-----|
| 类型推断 | ❌ 不支持 | ✅ 自动推断 |
| 语法 | JSON 格式 | TypeScript 链式 API |
| 验证功能 | 标准验证 | 丰富的验证方法 |
| 学习曲线 | 较陡 | 较平缓 |
| 生态系统 | 广泛支持 | TypeScript 生态 |

**建议：**
- TypeScript 项目 → 使用 Zod
- 跨语言项目 → 使用 JSON Schema
- 简单场景 → 两者都可以

## 常见问题

### Q: 结构化输出会影响 Agent 的能力吗？

**A:** 不会。Agent 仍然可以使用所有工具，只是最终输出会被格式化为符合 Schema 的 JSON。

### Q: 如果 Agent 无法生成符合 Schema 的数据怎么办？

**A:** SDK 会抛出验证错误。建议：
- 简化 Schema
- 在提示词中明确说明数据要求
- 使用更宽松的验证规则

### Q: 可以同时获取文本和结构化输出吗？

**A:** 不可以。启用结构化输出后，Agent 只返回 JSON 数据。如果需要文本说明，可以在 Schema 中添加 `explanation` 字段。

### Q: dereferenceAndClean 是必需的吗？

**A:** 对于 Zod Schema，推荐使用。它会移除 Zod 生成的额外字段，使 Schema 更简洁。

## 下一步

- [系统提示词](./08-system-prompts.md) - 自定义 Agent 行为
- [MCP 服务器](./09-mcp-servers.md) - 扩展 Agent 能力

## 相关示例

- `examples/13-structured-output-query-company.ts` - JSON Schema 基础
- `examples/14-structured-output-by-zod.ts` - Zod Schema 使用
- `examples/15-structured-output-todo-tracking.ts` - 实战应用
