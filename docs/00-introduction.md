---
layout: default
title: 00. SDK 简介与安装
nav_order: 2
---

# SDK 简介与安装

## 什么是 Claude Agent SDK

Claude Agent SDK 是 Anthropic 官方提供的 Node.js SDK，让你能够轻松构建基于 Claude 的 Agent（智能代理）。Agent 可以自主使用工具、执行任务，并与用户进行多轮交互。

### 核心概念

- **Agent（代理）**：能够自主思考、使用工具完成任务的智能体
- **Query（查询）**：与 Agent 交互的基本单元
- **Tools（工具）**：Agent 可以调用的功能，如读取文件、搜索网页等
- **Message（消息）**：Agent 交互过程中产生的消息流

## 安装与配置

### 1. 安装 SDK

```bash
npm install @anthropic-ai/agent-sdk
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. 基本项目结构

```
your-project/
├── .env
├── package.json
├── lib/
│   └── setup.ts        # 配置辅助函数
└── examples/
    └── your-agent.ts   # 你的 Agent 代码
```

## 第一个 Agent 示例

### 示例 1：基础查询

**文件：** `examples/01-query-basic-query.ts`

```typescript
import { query } from "../lib/setup.js";

// 最简单的 Agent 查询
for await (const message of query({
    prompt: "What files are in this directory?",
    options: {
        allowedTools: ["Read", "Grep"],  // 允许使用的工具
    }
})) {
    // 打印结果
    if ("result" in message) {
        console.log(message.result);
    }
}
```

**代码解析：**

1. **`query()` 函数**：SDK 的核心函数，发起一次 Agent 查询
2. **`prompt`**：给 Agent 的任务描述
3. **`allowedTools`**：限制 Agent 可以使用的工具（安全性考虑）
4. **`for await...of`**：异步迭代消息流
5. **`message.result`**：最终执行结果

**运行示例：**

```bash
npx tsx examples/01-query-basic-query.ts
```

**预期输出：**
Agent 会使用 Read 或 Grep 工具列出当前目录的文件。

### 示例 2：文件操作与自动审批

**文件：** `examples/02-write-modify-file.ts`

```typescript
import { query } from "../lib/setup.js";

// Agentic loop: 流式输出 Claude 的工作过程
for await (const message of query({
    prompt: "Write unit tests for utils.py, run them, and fix any failures",
    options: {
        allowedTools: ["Read", "Edit", "Glob", "WebSearch", "Bash"],
        permissionMode: "acceptEdits",  // 自动批准文件编辑
        systemPrompt: "You are a senior Python developer. Always follow PEP 8 style guidelines."
    }
})) {
    // 打印详细的执行过程
    if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
            if ("text" in block) {
                console.log(block.text);             // Claude 的推理过程
            } else if ("name" in block) {
                console.log(`Tool: ${block.name}`);  // 正在调用的工具
            }
        }
    } else if (message.type === "result") {
        console.log(`Done: ${message.subtype}`);     // 最终结果
    }
}
```

**代码解析：**

1. **`permissionMode: "acceptEdits"`**：自动批准所有文件编辑操作，无需手动确认
2. **`systemPrompt`**：自定义 Agent 的系统提示词，定义其角色和行为规范
3. **消息类型**：
   - `assistant`：Claude 的思考和工具调用
   - `result`：任务完成状态

**环境假设：**
- 项目中存在 `utils.py` 文件
- 已安装 Python 和测试框架（如 pytest）

**权限模式说明：**

| 模式 | 说明 | 使用场景 |
|------|------|---------|
| `ask`（默认） | 每次工具调用都需要用户确认 | 开发测试阶段 |
| `acceptEdits` | 自动批准文件编辑，其他工具需确认 | 自动化代码修改 |
| `acceptAll` | 自动批准所有工具调用 | 完全自动化场景 |

## 消息流详解

Agent 执行过程中会产生多种类型的消息：

```typescript
// 系统初始化消息
{
    type: "system",
    subtype: "init",
    session_id: "sess_xxx",  // 会话 ID
    // ...
}

// Assistant 消息（Claude 的思考和工具调用）
{
    type: "assistant",
    message: {
        content: [
            { type: "text", text: "让我查看目录..." },
            { type: "tool_use", name: "Read", input: {...} }
        ]
    }
}

// 工具执行结果
{
    type: "result",
    subtype: "success" | "error",
    result: "..."
}
```

## 常用工具列表

SDK 内置了多种工具，通过 `allowedTools` 配置：

| 工具名 | 功能 | 示例 |
|--------|------|------|
| `Read` | 读取文件 | 查看代码、配置文件 |
| `Write` | 写入文件 | 创建新文件 |
| `Edit` | 编辑文件 | 修改现有代码 |
| `Glob` | 文件模式匹配 | 查找特定类型文件 |
| `Grep` | 内容搜索 | 搜索代码中的关键字 |
| `Bash` | 执行命令 | 运行测试、构建项目 |
| `WebSearch` | 网页搜索 | 查找文档、解决方案 |

## 实战场景

### 场景 1：代码审查助手

使用 Agent 自动审查代码质量：

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Review the authentication module for security issues and best practices",
    options: {
        allowedTools: ["Read", "Grep", "Glob"],
        systemPrompt: "You are a security expert. Focus on authentication vulnerabilities, SQL injection, and XSS risks."
    }
})) {
    if ("result" in message) {
        console.log(message.result);
    }
}
```

### 场景 2：自动化测试

让 Agent 编写和运行测试：

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Write unit tests for the UserService class and ensure they pass",
    options: {
        allowedTools: ["Read", "Write", "Bash"],
        permissionMode: "acceptEdits"
    }
})) {
    if (message.type === "result") {
        console.log(`Tests ${message.subtype}: ${message.result}`);
    }
}
```

### 场景 3：文档生成

自动生成项目文档：

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Generate API documentation for all endpoints in the routes/ directory",
    options: {
        allowedTools: ["Read", "Glob", "Write"],
        systemPrompt: "Generate comprehensive API documentation with examples"
    }
})) {
    if ("result" in message) {
        console.log(message.result);
    }
}
```

## 最佳实践

### 1. 最小权限原则

只授予 Agent 完成任务所需的最少工具权限：

```typescript
// ✅ 好的做法：明确指定需要的工具
allowedTools: ["Read", "Grep"]

// ❌ 避免：授予所有工具权限（除非必要）
allowedTools: ["*"]
```

### 2. 使用系统提示词

通过 `systemPrompt` 定义 Agent 的角色和行为规范：

```typescript
systemPrompt: "You are a senior Python developer. Always follow PEP 8 style guidelines."
```

### 3. 处理不同类型的消息

根据消息类型进行不同的处理：

```typescript
for await (const message of query({...})) {
    if (message.type === "assistant") {
        // 处理 Claude 的输出
    } else if (message.type === "result") {
        // 处理最终结果
    }
}
```

## 下一步

- [流式输入](./01-streaming-input.md) - 学习如何实现多轮对话
- [权限处理](./02-handling-permissions.md) - 深入了解权限管理机制

## 相关示例

- `examples/01-query-basic-query.ts` - 基础查询
- `examples/02-write-modify-file.ts` - 文件操作与自动审批
