---
layout: default
title: 自定义工具
nav_order: 12
parent: 工具与扩展
---

# 自定义工具

## 概述

自定义工具（Custom Tools）允许你在 SDK 内部创建专用工具，扩展 Agent 的能力。与 MCP 服务器相比，自定义工具：
- 更轻量，无需额外进程
- 直接在 TypeScript/JavaScript 中实现
- 可以访问应用的内部状态
- 适合项目特定的功能

## 自定义工具架构

```
┌──────────────────────────────────────────────────────────┐
│                  自定义工具架构                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  createSdkMcpServer()                                    │
│       ↓                                                  │
│  定义工具                                                 │
│  ├─ tool() - 工具定义                                     │
│  ├─ Zod Schema - 参数验证                                │
│  └─ Handler - 执行逻辑                                    │
│       ↓                                                  │
│  注册到 mcpServers                                        │
│       ↓                                                  │
│  Agent 调用工具                                           │
│       ↓                                                  │
│  返回结果                                                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 核心 API

### createSdkMcpServer

创建自定义工具服务器：

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

const server = createSdkMcpServer({
    name: "server-name",     // 服务器名称
    version: "1.0.0",        // 版本号
    tools: [                 // 工具列表
        tool(...),
        tool(...),
    ]
});
```

### tool

定义单个工具：

```typescript
tool(
    "tool_name",              // 工具名称
    "Tool description",       // 工具描述
    {                         // 参数 Schema (Zod)
        param1: z.string(),
        param2: z.number()
    },
    async (args) => {         // 工具处理函数
        // 执行逻辑
        return {
            content: [{
                type: "text",
                text: "结果"
            }]
        };
    }
);
```

## 示例 1：单个自定义工具

**文件：** `examples/23-custom-tool.ts`

创建天气查询工具：

```typescript
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { query } from "../lib/setup.js";

// 创建自定义工具服务器
const customServer = createSdkMcpServer({
    name: "my-custom-tools",
    version: "1.0.0",
    tools: [
        tool(
            "get_weather",
            "Get current temperature for a location using coordinates",
            {
                latitude: z.number().describe("Latitude coordinate"),
                longitude: z.number().describe("Longitude coordinate")
            },
            async (args) => {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?` +
                    `latitude=${args.latitude}&longitude=${args.longitude}&` +
                    `current=temperature_2m&temperature_unit=fahrenheit`
                );
                const data = await response.json();

                return {
                    content: [{
                        type: "text",
                        text: `Temperature: ${data.current.temperature_2m}°F`
                    }]
                };
            }
        )
    ]
});

// 使用自定义工具
async function* generateMessages() {
    yield {
        type: "user" as const,
        message: {
            role: "user" as const,
            content: "What's the weather in San Francisco?"
        }
    };
}

for await (const message of query({
    prompt: generateMessages(),
    options: {
        mcpServers: {
            "my-custom-tools": customServer  // 注册服务器
        },
        allowedTools: [
            "mcp__my-custom-tools__get_weather"  // 允许工具
        ],
        maxTurns: 3
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}
```

**代码解析：**

1. **工具定义**：
   ```typescript
   tool(
       "get_weather",        // 工具名称
       "Get current...",     // 描述（Agent 用来理解工具用途）
       {                     // 参数定义
           latitude: z.number().describe("Latitude coordinate"),
           longitude: z.number().describe("Longitude coordinate")
       },
       async (args) => {     // 处理函数
           // args.latitude 和 args.longitude 是类型安全的
           // 返回格式化的结果
       }
   );
   ```

2. **返回格式**：
   ```typescript
   return {
       content: [{
           type: "text",
           text: "结果文本"
       }]
   };
   ```

3. **工具注册**：
   ```typescript
   mcpServers: {
       "my-custom-tools": customServer  // 作为对象传入
   }
   ```

4. **工具调用**：
   ```typescript
   allowedTools: [
       "mcp__my-custom-tools__get_weather"  // 格式：mcp__服务器名__工具名
   ]
   ```

## 示例 2：多个自定义工具

**文件：** `examples/24-custom-tool-multiple.ts`

创建计算器工具集：

```typescript
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { query } from "../lib/setup.js";

const calculatorServer = createSdkMcpServer({
    name: "calculator",
    version: "1.0.0",
    tools: [
        // 工具 1：基础计算
        tool(
            "calculate",
            "Perform mathematical calculations",
            {
                expression: z.string().describe("Mathematical expression to evaluate"),
                precision: z.number().optional().default(2).describe("Decimal precision")
            },
            async (args) => {
                try {
                    // 生产环境应使用安全的数学库
                    const result = eval(args.expression);  // 仅示例！
                    const formatted = Number(result).toFixed(args.precision);

                    return {
                        content: [{
                            type: "text",
                            text: `${args.expression} = ${formatted}`
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error: Invalid expression - ${error.message}`
                        }]
                    };
                }
            }
        ),

        // 工具 2：复利计算
        tool(
            "compound_interest",
            "Calculate compound interest for an investment",
            {
                principal: z.number().positive().describe("Initial investment amount"),
                rate: z.number().describe("Annual interest rate (as decimal, e.g., 0.05 for 5%)"),
                time: z.number().positive().describe("Investment period in years"),
                n: z.number().positive().default(12).describe("Compounding frequency per year")
            },
            async (args) => {
                const amount = args.principal * Math.pow(
                    1 + args.rate / args.n,
                    args.n * args.time
                );
                const interest = amount - args.principal;

                return {
                    content: [{
                        type: "text",
                        text: `Investment Analysis:\n` +
                            `Principal: $${args.principal.toFixed(2)}\n` +
                            `Rate: ${(args.rate * 100).toFixed(2)}%\n` +
                            `Time: ${args.time} years\n` +
                            `Compounding: ${args.n} times per year\n\n` +
                            `Final Amount: $${amount.toFixed(2)}\n` +
                            `Interest Earned: $${interest.toFixed(2)}\n` +
                            `Return: ${((interest / args.principal) * 100).toFixed(2)}%`
                    }]
                };
            }
        ),

        // 工具 3：API 数据获取
        tool(
            "fetch_data",
            "Fetch data from an API",
            {
                endpoint: z.string().url().describe("API endpoint URL")
            },
            async (args) => {
                try {
                    const response = await fetch(args.endpoint);

                    if (!response.ok) {
                        return {
                            content: [{
                                type: "text",
                                text: `API error: ${response.status} ${response.statusText}`
                            }]
                        };
                    }

                    const data = await response.json();
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(data, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Failed to fetch data: ${error.message}`
                        }]
                    };
                }
            }
        )
    ]
});

// 使用多个工具
async function* generateMessages() {
    yield {
        type: "user" as const,
        message: {
            role: "user" as const,
            content: "Calculate 5 + 3 and compute compound interest for $1000 at 5% for 10 years"
        }
    };
}

for await (const message of query({
    prompt: generateMessages(),
    options: {
        mcpServers: {
            calculator: calculatorServer
        },
        allowedTools: [
            "mcp__calculator__calculate",
            "mcp__calculator__compound_interest",
            // fetch_data 未列出，不可用
        ]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}
```

**代码解析：**

1. **多工具服务器**：
   ```typescript
   tools: [
       tool(...),  // 工具 1
       tool(...),  // 工具 2
       tool(...),  // 工具 3
   ]
   ```

2. **可选参数**：
   ```typescript
   precision: z.number().optional().default(2)
   ```
   - `optional()`: 参数可选
   - `default(2)`: 默认值

3. **参数验证**：
   ```typescript
   principal: z.number().positive()  // 必须是正数
   endpoint: z.string().url()        // 必须是有效 URL
   ```

4. **错误处理**：
   ```typescript
   try {
       // 工具逻辑
   } catch (error) {
       return {
           content: [{
               type: "text",
               text: `Error: ${error.message}`
           }]
       };
   }
   ```

## 参数验证详解

### Zod 验证规则

```typescript
// 字符串
z.string()
    .min(3)              // 最小长度
    .max(100)            // 最大长度
    .email()             // 邮箱格式
    .url()               // URL 格式
    .regex(/^[A-Z]+$/)   // 正则表达式

// 数字
z.number()
    .int()               // 整数
    .positive()          // 正数
    .negative()          // 负数
    .min(0)              // 最小值
    .max(100)            // 最大值

// 布尔值
z.boolean()

// 枚举
z.enum(['option1', 'option2', 'option3'])

// 数组
z.array(z.string())
    .min(1)              // 最少元素
    .max(10)             // 最多元素

// 对象
z.object({
    name: z.string(),
    age: z.number()
})

// 可选
z.string().optional()

// 默认值
z.number().default(10)

// 可为 null
z.string().nullable()
```

### 参数描述

使用 `.describe()` 添加描述，帮助 Agent 理解参数用途：

```typescript
{
    query: z.string().describe("搜索查询字符串"),
    limit: z.number().default(10).describe("返回结果数量，默认 10"),
    include_metadata: z.boolean().default(false).describe("是否包含元数据")
}
```

## 返回格式

### 文本内容

```typescript
return {
    content: [{
        type: "text",
        text: "结果文本"
    }]
};
```

### 多个内容块

```typescript
return {
    content: [
        {
            type: "text",
            text: "第一部分"
        },
        {
            type: "text",
            text: "第二部分"
        }
    ]
};
```

### 图片内容

```typescript
return {
    content: [{
        type: "image",
        source: {
            type: "base64",
            media_type: "image/png",
            data: base64ImageData
        }
    }]
};
```

## 实战场景

### 场景 1：数据库查询工具

```typescript
const dbServer = createSdkMcpServer({
    name: "database",
    version: "1.0.0",
    tools: [
        tool(
            "query_users",
            "Query users from database",
            {
                filter: z.string().optional().describe("SQL WHERE clause"),
                limit: z.number().default(10).describe("Max results")
            },
            async (args) => {
                // 连接数据库
                const db = await connectToDatabase();

                // 执行查询
                const query = `SELECT * FROM users ${args.filter ? 'WHERE ' + args.filter : ''} LIMIT ${args.limit}`;
                const results = await db.query(query);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(results, null, 2)
                    }]
                };
            }
        )
    ]
});
```

### 场景 2：文件操作工具

```typescript
import fs from 'fs/promises';

const fileServer = createSdkMcpServer({
    name: "files",
    version: "1.0.0",
    tools: [
        tool(
            "search_files",
            "Search for files by pattern",
            {
                pattern: z.string().describe("Glob pattern (e.g., '**/*.ts')"),
                directory: z.string().default(process.cwd()).describe("Search directory")
            },
            async (args) => {
                const { glob } = await import('glob');
                const files = await glob(args.pattern, {
                    cwd: args.directory
                });

                return {
                    content: [{
                        type: "text",
                        text: `Found ${files.length} files:\n${files.join('\n')}`
                    }]
                };
            }
        ),

        tool(
            "read_json",
            "Read and parse JSON file",
            {
                path: z.string().describe("File path")
            },
            async (args) => {
                try {
                    const content = await fs.readFile(args.path, 'utf-8');
                    const data = JSON.parse(content);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(data, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error reading file: ${error.message}`
                        }]
                    };
                }
            }
        )
    ]
});
```

### 场景 3：外部 API 集成

```typescript
const apiServer = createSdkMcpServer({
    name: "external-apis",
    version: "1.0.0",
    tools: [
        tool(
            "github_search",
            "Search GitHub repositories",
            {
                query: z.string().describe("Search query"),
                sort: z.enum(['stars', 'forks', 'updated']).default('stars'),
                limit: z.number().default(5).describe("Number of results")
            },
            async (args) => {
                const response = await fetch(
                    `https://api.github.com/search/repositories?` +
                    `q=${encodeURIComponent(args.query)}&` +
                    `sort=${args.sort}&` +
                    `per_page=${args.limit}`
                );

                const data = await response.json();

                const results = data.items.map(repo => ({
                    name: repo.full_name,
                    stars: repo.stargazers_count,
                    url: repo.html_url,
                    description: repo.description
                }));

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(results, null, 2)
                    }]
                };
            }
        ),

        tool(
            "translate_text",
            "Translate text using external API",
            {
                text: z.string().describe("Text to translate"),
                from: z.string().default('auto').describe("Source language"),
                to: z.string().describe("Target language")
            },
            async (args) => {
                // 调用翻译 API
                const response = await fetch('https://translation-api.example.com/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.TRANSLATION_API_KEY}`
                    },
                    body: JSON.stringify(args)
                });

                const data = await response.json();

                return {
                    content: [{
                        type: "text",
                        text: data.translated_text
                    }]
                };
            }
        )
    ]
});
```

### 场景 4：系统信息工具

```typescript
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const systemServer = createSdkMcpServer({
    name: "system",
    version: "1.0.0",
    tools: [
        tool(
            "get_system_info",
            "Get system information",
            {},
            async () => {
                const info = {
                    platform: os.platform(),
                    arch: os.arch(),
                    cpus: os.cpus().length,
                    memory: {
                        total: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                        free: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`
                    },
                    uptime: `${(os.uptime() / 3600).toFixed(2)} hours`
                };

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(info, null, 2)
                    }]
                };
            }
        ),

        tool(
            "run_command",
            "Execute shell command (use with caution)",
            {
                command: z.string().describe("Shell command to execute")
            },
            async (args) => {
                try {
                    const { stdout, stderr } = await execAsync(args.command);

                    return {
                        content: [{
                            type: "text",
                            text: stdout || stderr
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Command failed: ${error.message}`
                        }]
                    };
                }
            }
        )
    ]
});
```

## 最佳实践

### 1. 清晰的工具描述

```typescript
// ✅ 好的做法
tool(
    "search_products",
    "Search for products in the inventory database by name, category, or SKU",
    { ... }
)

// ❌ 避免
tool(
    "search",
    "Search",
    { ... }
)
```

### 2. 详细的参数描述

```typescript
// ✅ 好的做法
{
    query: z.string().describe("Search query - can be product name, SKU, or category"),
    min_price: z.number().optional().describe("Minimum price filter in USD"),
    max_price: z.number().optional().describe("Maximum price filter in USD")
}

// ❌ 避免
{
    query: z.string(),
    min_price: z.number().optional(),
    max_price: z.number().optional()
}
```

### 3. 完善的错误处理

```typescript
async (args) => {
    try {
        // 工具逻辑
        const result = await performOperation(args);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(result)
            }]
        };
    } catch (error) {
        // 记录错误
        console.error('Tool error:', error);

        // 返回友好的错误消息
        return {
            content: [{
                type: "text",
                text: `Operation failed: ${error.message}\nPlease check the parameters and try again.`
            }]
        };
    }
}
```

### 4. 输入验证

```typescript
tool(
    "process_file",
    "Process a file",
    {
        path: z.string()
            .min(1)
            .regex(/^[^<>:"|?*]+$/, "Invalid file path characters")
            .describe("File path to process")
    },
    async (args) => {
        // 额外的安全检查
        if (args.path.includes('..')) {
            return {
                content: [{
                    type: "text",
                    text: "Error: Path traversal not allowed"
                }]
            };
        }

        // 处理文件...
    }
)
```

### 5. 性能优化

```typescript
// 使用缓存
const cache = new Map();

tool(
    "expensive_operation",
    "Perform expensive operation",
    { ... },
    async (args) => {
        const cacheKey = JSON.stringify(args);

        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        const result = await expensiveOperation(args);
        cache.set(cacheKey, result);

        return result;
    }
)
```

## 常见问题

### Q: 自定义工具和 MCP 服务器如何选择？

**A:**
- **自定义工具**: 轻量、项目特定、需要访问应用状态
- **MCP 服务器**: 重量级、可复用、独立进程

### Q: 工具可以返回图片吗？

**A:** 可以，使用 base64 编码：

```typescript
return {
    content: [{
        type: "image",
        source: {
            type: "base64",
            media_type: "image/png",
            data: base64Data
        }
    }]
};
```

### Q: 如何调试自定义工具？

**A:** 在工具函数中添加日志：

```typescript
async (args) => {
    console.log('Tool called with:', args);

    const result = await operation(args);

    console.log('Tool result:', result);

    return result;
}
```

### Q: 工具可以调用其他工具吗？

**A:** 不建议。工具应该是独立的，由 Agent 协调调用顺序。

## 下一步

- [子代理](./11-subagents.md) - 构建专门的子代理
- [斜杠命令](./12-slash-commands.md) - 快捷命令系统

## 相关示例

- `examples/23-custom-tool.ts` - 单个自定义工具
- `examples/24-custom-tool-multiple.ts` - 多个自定义工具
