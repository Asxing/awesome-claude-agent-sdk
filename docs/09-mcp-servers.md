---
layout: default
title: MCP 服务器
nav_order: 11
parent: 工具与扩展
---

# MCP 服务器

## 概述

MCP (Model Context Protocol) 是一个开放协议，允许 Agent 通过标准化接口访问外部服务和数据源。通过 MCP 服务器，你可以：
- 连接到各种外部服务（文件系统、数据库、API 等）
- 扩展 Agent 的能力边界
- 使用社区提供的 MCP 服务器
- 创建自己的 MCP 服务器

## MCP 架构

```
┌──────────────────────────────────────────────────────────┐
│                    MCP 架构                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Claude Agent SDK                                        │
│       ↓                                                  │
│  MCP Client (内置)                                        │
│       ↓                                                  │
│  ┌─────────────┬─────────────┬─────────────┐            │
│  │             │             │             │            │
│  │  HTTP MCP   │  CLI MCP    │  自动加载   │            │
│  │  Server     │  Server     │  (.mcp.json)│            │
│  │             │             │             │            │
│  └─────────────┴─────────────┴─────────────┘            │
│       ↓              ↓              ↓                    │
│  外部服务      本地进程      配置文件                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## MCP 服务器类型

SDK 支持三种方式加载 MCP 服务器：

### 1. HTTP MCP 服务器

通过 HTTP 连接的远程服务器：

```typescript
mcpServers: {
    "server-name": {
        type: "http",
        url: "https://example.com/mcp"
    }
}
```

### 2. CLI MCP 服务器

通过命令行启动的本地服务器：

```typescript
mcpServers: {
    "server-name": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
}
```

### 3. 自动配置加载

从 `.mcp.json` 文件自动加载：

```json
{
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
        }
    }
}
```

## 示例 1：HTTP MCP 服务器

**文件：** `examples/20-mcp-query-claude-code-docs.ts`

连接到 Claude Code 官方文档服务器：

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Use the docs MCP server to explain what hooks are in Claude Code",
    options: {
        mcpServers: {
            "claude-code-docs": {
                type: "http",
                url: "https://code.claude.com/docs/mcp"
            }
        },
        allowedTools: ["mcp__claude-code-docs__*"]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}
```

**代码解析：**

1. **MCP 服务器配置**：
   ```typescript
   mcpServers: {
       "claude-code-docs": {        // 服务器名称
           type: "http",             // HTTP 类型
           url: "https://code.claude.com/docs/mcp"  // 服务器地址
       }
   }
   ```

2. **工具白名单**：
   ```typescript
   allowedTools: ["mcp__claude-code-docs__*"]
   ```
   - 格式：`mcp__<服务器名称>__<工具名称>`
   - `*` 通配符允许该服务器的所有工具

3. **工作流程**：
   ```
   用户查询
       ↓
   Agent 识别需要文档信息
       ↓
   调用 MCP 服务器工具
       ↓
   HTTP 请求到远程服务器
       ↓
   返回文档内容
       ↓
   Agent 整合信息并回答
   ```

## 示例 2：CLI MCP 服务器

**文件：** `examples/21-mcp-load-by-code.ts`

使用命令行启动的文件系统服务器：

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "List files in my project",
    options: {
        mcpServers: {
            "filesystem": {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()]
            }
        },
        allowedTools: ["mcp__filesystem__*"]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}
```

**代码解析：**

1. **CLI 服务器配置**：
   ```typescript
   mcpServers: {
       "filesystem": {
           command: "npx",    // 启动命令
           args: [            // 命令参数
               "-y",          // npx 自动安装
               "@modelcontextprotocol/server-filesystem",  // 包名
               process.cwd()  // 工作目录
           ]
       }
   }
   ```

2. **进程管理**：
   - SDK 自动启动子进程
   - 通过 stdio 通信
   - 查询结束时自动清理

3. **常用 MCP 服务器**：
   ```typescript
   // 文件系统
   "@modelcontextprotocol/server-filesystem"

   // Git 操作
   "@modelcontextprotocol/server-git"

   // PostgreSQL
   "@modelcontextprotocol/server-postgres"

   // Puppeteer (浏览器自动化)
   "@modelcontextprotocol/server-puppeteer"
   ```

## 示例 3：自动配置加载

**文件：** `examples/22-mcp-load-config-automatic.ts`

从配置文件自动加载 MCP 服务器：

```typescript
import { query } from "../lib/setup.js";

// 注意：需要在项目根目录创建 .mcp.json 配置文件
for await (const message of query({
    prompt: "List files in my project",
    options: {
        allowedTools: ["mcp__filesystem__*"]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}
```

**配置文件：** `.mcp.json`

```json
{
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "/Users/username/projects"
            ]
        },
        "postgres": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-postgres",
                "postgresql://localhost/mydb"
            ]
        }
    }
}
```

**代码解析：**

1. **配置文件位置**：
   - 项目根目录：`<project-root>/.mcp.json`
   - 用户目录：`~/.mcp.json`

2. **自动加载**：
   - SDK 自动读取配置文件
   - 无需在代码中配置 `mcpServers`
   - 只需在 `allowedTools` 中指定即可

3. **配置优先级**：
   ```
   代码中的 mcpServers > 项目 .mcp.json > 用户 .mcp.json
   ```

## 官方 MCP 服务器

### 文件系统服务器

访问本地文件系统：

```typescript
mcpServers: {
    "filesystem": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
}
```

**提供的工具：**
- `read_file` - 读取文件
- `write_file` - 写入文件
- `list_directory` - 列出目录
- `create_directory` - 创建目录
- `move_file` - 移动文件
- `delete_file` - 删除文件

### Git 服务器

Git 仓库操作：

```typescript
mcpServers: {
    "git": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-git", "/path/to/repo"]
    }
}
```

**提供的工具：**
- `git_status` - 查看状态
- `git_diff` - 查看差异
- `git_log` - 查看历史
- `git_commit` - 提交更改
- `git_branch` - 分支管理

### PostgreSQL 服务器

数据库查询：

```typescript
mcpServers: {
    "postgres": {
        command: "npx",
        args: [
            "-y",
            "@modelcontextprotocol/server-postgres",
            "postgresql://user:pass@localhost/dbname"
        ]
    }
}
```

**提供的工具：**
- `query` - 执行 SQL 查询
- `list_tables` - 列出表
- `describe_table` - 表结构
- `execute` - 执行 SQL 语句

### Puppeteer 服务器

浏览器自动化：

```typescript
mcpServers: {
    "puppeteer": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
}
```

**提供的工具：**
- `navigate` - 访问网页
- `screenshot` - 截图
- `click` - 点击元素
- `type` - 输入文本
- `evaluate` - 执行 JavaScript

## 实战场景

### 场景 1：文件系统操作

自动化文件管理：

```typescript
for await (const message of query({
    prompt: "Find all TypeScript files, analyze their imports, and create a dependency graph",
    options: {
        mcpServers: {
            "filesystem": {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()]
            }
        },
        allowedTools: ["mcp__filesystem__*", "Write"]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}
```

### 场景 2：数据库查询和分析

数据分析任务：

```typescript
for await (const message of query({
    prompt: "Query the users table, analyze the data, and generate a report",
    options: {
        mcpServers: {
            "postgres": {
                command: "npx",
                args: [
                    "-y",
                    "@modelcontextprotocol/server-postgres",
                    process.env.DATABASE_URL
                ]
            }
        },
        allowedTools: ["mcp__postgres__*"],
        outputFormat: {
            type: "json_schema",
            schema: {
                type: "object",
                properties: {
                    total_users: { type: "number" },
                    active_users: { type: "number" },
                    top_countries: { type: "array", items: { type: "string" } }
                }
            }
        }
    }
})) {
    if (message.type === "result" && message.structured_output) {
        console.log(message.structured_output);
    }
}
```

### 场景 3：Web 抓取

自动化浏览器操作：

```typescript
for await (const message of query({
    prompt: "Navigate to example.com, extract all links, and save to a file",
    options: {
        mcpServers: {
            "puppeteer": {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-puppeteer"]
            }
        },
        allowedTools: ["mcp__puppeteer__*", "Write"]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}
```

### 场景 4：多服务器协作

组合使用多个 MCP 服务器：

```typescript
for await (const message of query({
    prompt: "Query the database for user data, generate a report, and commit it to git",
    options: {
        mcpServers: {
            "postgres": {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-postgres", dbUrl]
            },
            "git": {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-git", process.cwd()]
            }
        },
        allowedTools: [
            "mcp__postgres__*",
            "mcp__git__*",
            "Write"
        ]
    }
})) {
    // Agent 会自动协调使用多个服务器
}
```

## 创建自定义 MCP 服务器

### 基本结构

MCP 服务器是一个实现 MCP 协议的程序：

```typescript
// my-mcp-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
    name: "my-server",
    version: "1.0.0"
});

// 注册工具
server.setRequestHandler("tools/list", async () => ({
    tools: [
        {
            name: "my_tool",
            description: "My custom tool",
            inputSchema: {
                type: "object",
                properties: {
                    input: { type: "string" }
                }
            }
        }
    ]
}));

// 处理工具调用
server.setRequestHandler("tools/call", async (request) => {
    if (request.params.name === "my_tool") {
        // 执行工具逻辑
        return {
            content: [
                {
                    type: "text",
                    text: "Tool result"
                }
            ]
        };
    }
});

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 使用自定义服务器

```typescript
for await (const message of query({
    prompt: "Use my custom tool",
    options: {
        mcpServers: {
            "my-server": {
                command: "node",
                args: ["./my-mcp-server.js"]
            }
        },
        allowedTools: ["mcp__my-server__*"]
    }
})) {
    // ...
}
```

## MCP 配置最佳实践

### 1. 使用环境变量

保护敏感信息：

```json
{
    "mcpServers": {
        "postgres": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-postgres"
            ],
            "env": {
                "DATABASE_URL": "${DATABASE_URL}"
            }
        }
    }
}
```

### 2. 分离环境配置

不同环境使用不同配置：

```json
// .mcp.development.json
{
    "mcpServers": {
        "postgres": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-postgres", "localhost"]
        }
    }
}

// .mcp.production.json
{
    "mcpServers": {
        "postgres": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-postgres", "prod-server"]
        }
    }
}
```

### 3. 工具白名单

精确控制可用工具：

```typescript
// ✅ 好的做法：明确指定
allowedTools: [
    "mcp__filesystem__read_file",
    "mcp__filesystem__list_directory"
]

// ❌ 避免：过度授权
allowedTools: ["mcp__filesystem__*"]
```

### 4. 错误处理

处理 MCP 服务器错误：

```typescript
try {
    for await (const message of query({
        prompt: "Use MCP server",
        options: {
            mcpServers: {
                "my-server": {
                    command: "node",
                    args: ["./server.js"]
                }
            },
            allowedTools: ["mcp__my-server__*"]
        }
    })) {
        // 处理消息
    }
} catch (error) {
    if (error.message.includes("MCP server failed")) {
        console.error("MCP server error:", error);
        // 回退到其他方案
    }
}
```

## 工具命名规范

MCP 工具名称格式：

```
mcp__<服务器名称>__<工具名称>
```

**示例：**
```typescript
// 文件系统服务器的 read_file 工具
"mcp__filesystem__read_file"

// PostgreSQL 服务器的 query 工具
"mcp__postgres__query"

// 自定义服务器的自定义工具
"mcp__my-server__my-tool"
```

## 调试 MCP 服务器

### 1. 启用详细日志

```typescript
options: {
    mcpServers: {
        "my-server": {
            command: "node",
            args: ["./server.js"],
            env: {
                DEBUG: "mcp:*"  // 启用调试日志
            }
        }
    }
}
```

### 2. 测试服务器连接

```typescript
// 简单测试查询
for await (const message of query({
    prompt: "List available tools from the MCP server",
    options: {
        mcpServers: {
            "test-server": {
                command: "node",
                args: ["./server.js"]
            }
        },
        allowedTools: ["mcp__test-server__*"]
    }
})) {
    console.log(message);
}
```

### 3. 监控子进程

```typescript
// 在服务器代码中添加日志
console.error("[MCP Server] Started");
console.error("[MCP Server] Received request:", request);
console.error("[MCP Server] Sending response:", response);
```

## 社区 MCP 服务器

探索社区提供的 MCP 服务器：

- **GitHub**: https://github.com/modelcontextprotocol/servers
- **NPM**: 搜索 `@modelcontextprotocol/server-*`
- **文档**: https://modelcontextprotocol.io

**热门服务器：**
- `@modelcontextprotocol/server-slack` - Slack 集成
- `@modelcontextprotocol/server-github` - GitHub API
- `@modelcontextprotocol/server-google-drive` - Google Drive
- `@modelcontextprotocol/server-sqlite` - SQLite 数据库

## 常见问题

### Q: MCP 服务器和自定义工具有什么区别？

**A:**
- **MCP 服务器**: 独立进程，可复用，支持多种语言
- **自定义工具**: SDK 内部工具，TypeScript/JavaScript，更轻量

### Q: 如何调试 MCP 服务器启动失败？

**A:**
1. 检查命令和参数是否正确
2. 确保依赖已安装（npx 会自动安装）
3. 查看错误消息
4. 尝试手动运行命令测试

### Q: MCP 服务器会影响性能吗？

**A:** 会有一定开销：
- 进程启动时间
- 进程间通信
- 建议复用服务器实例

### Q: 可以同时使用多个 MCP 服务器吗？

**A:** 可以！SDK 支持同时连接多个服务器，Agent 会根据需要选择合适的工具。

## 下一步

- [自定义工具](./10-custom-tools.md) - 创建 SDK 内部工具
- [子代理](./11-subagents.md) - 构建专门的子代理

## 相关示例

- `examples/20-mcp-query-claude-code-docs.ts` - HTTP MCP 服务器
- `examples/21-mcp-load-by-code.ts` - CLI MCP 服务器
- `examples/22-mcp-load-config-automatic.ts` - 自动配置加载
