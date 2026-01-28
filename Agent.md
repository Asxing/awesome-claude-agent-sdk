# Agent System Guide (AI 项目理解指南)

This document provides AI agents with a comprehensive understanding of the project structure, capabilities, and best practices for working with this codebase.

## 🎯 Project Overview

**awesome-claude-agent-sdk** 是一个集成了 Claude AI 和 Model Context Protocol (MCP) 的智能代理框架示例库。该项目展示了如何构建能够：
- 理解复杂任务并自主决策
- 访问外部工具和数据源
- 维持上下文状态
- 处理用户交互和权限
- 生成结构化输出

## 📚 快速项目理解

### 核心文件结构
```
├── examples/              # 40+ 个示例脚本，展示不同使用场景
├── lib/                   # 通用工具和设置函数
├── plugins/               # 可扩展的插件系统（代码审查等）
├── scripts/               # 构建和工具脚本
├── types/                 # TypeScript 类型定义
├── .mcp.json              # MCP 服务器配置
├── package.json           # 项目依赖和脚本
└── tsconfig.json          # TypeScript 编译配置
```

### 核心概念

#### 1. **Agent（智能代理）**
```typescript
// 代理是能够：
// - 接收用户提示/问题
// - 使用可用工具进行推理和执行
// - 生成结构化或自由文本的回复
// - 维持对话状态和历史

// 示例：基础查询代理
import { Anthropic } from "@anthropic-ai/sdk";
const client = new Anthropic();
const message = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  tools: [...],  // 工具定义
  messages: [{ role: "user", content: prompt }]
});
```

#### 2. **Model Context Protocol (MCP)**
MCP 是一个标准化协议，允许 AI 模型访问：
- **文件系统** — 读写文件、列出目录
- **Web APIs** — 执行搜索、获取数据
- **自定义工具** — 执行特定领域的操作
- **数据库** — 查询和修改数据

**示例 MCP 服务器配置** (`.mcp.json`):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["mcp-server-filesystem"]
    }
  }
}
```

#### 3. **工具（Tools）**
代理可以访问的函数集合，定义如下：
```typescript
const tools = [
  {
    name: "read_file",
    description: "读取文件内容",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径" }
      },
      required: ["path"]
    }
  }
];
```

#### 4. **权限与批准（Permissions & Approvals）**
控制代理可以执行的操作：
```typescript
// 三种权限模式：
// - "auto" — 自动批准所有工具调用
// - "ask" — 询问用户是否允许
// - "acceptEdits" — 自动批准编辑操作
```

#### 5. **会话（Sessions）**
维持代理的对话状态和历史：
```typescript
// 会话允许：
// - 多轮对话的连续性
// - 检查点和回滚
// - 分支和合并（forking）
```

## 🔍 示例分类导览

### 入门必看（推荐顺序）
1. **01-query-basic-query.ts** — 最简单的代理查询
2. **02-write-modify-file.ts** — 让代理修改文件
3. **13-structured-output-query-company.ts** — 结构化输出

### 权限与控制
- **05-permission-at-query-time.ts** — 运行时权限检查
- **07-approval-handle-tool-approval-requests.ts** — 工具批准工作流
- **08-approval-handle-clarifying-questions.ts** — 澄清问题处理

### 状态与会话管理
- **09-session-getting-session-id.ts** — 会话追踪
- **10-session-forking-a-session.ts** — 会话分支
- **11-rewind-single-checkpoint.ts** — 单个检查点回滚

### 高级功能
- **26-subagent-programmatic-definition.ts** — 子代理定义
- **37-cost-track.ts** — API 成本追踪
- **38-todo-list-monitor.ts** — 实时任务监控

## 💡 代理工作流程

```
用户输入
    ↓
[代理初始化]
    ↓
[理解任务] ← 使用系统提示和上下文
    ↓
[规划步骤] ← 分析需要的工具
    ↓
[执行工具] ← 调用 MCP 提供的工具
    ↓
[处理结果] ← 分析工具输出
    ↓
[迭代/完成] ← 是否需要更多工具调用？
    ↓
[生成输出] ← 结构化或自由文本
    ↓
用户接收结果
```

## 🛠️ 常见代理模式

### 1. 查询型代理（Query Agent）
```typescript
// 用途：回答问题、分析信息
// 工具：Read, Grep, Search, Glob
// 示例：01-query-basic-query.ts
```

### 2. 编辑型代理（Editing Agent）
```typescript
// 用途：修改文件、重构代码
// 工具：Edit, Bash, CreateFile
// 示例：02-write-modify-file.ts
// 特点：自动或手动批准编辑
```

### 3. 监控型代理（Monitor Agent）
```typescript
// 用途：持续监控任务进度
// 特点：实时更新、进度显示
// 示例：38-todo-list-monitor.ts, 39-todo-list-real-time-progress-display.ts
```

### 4. 审查型代理（Review Agent）
```typescript
// 用途：代码审查、质量检查
// 特点：使用自定义规则和标准
// 示例：plugins/code-review/
```

### 5. 子代理（Subagent）
```typescript
// 用途：分解复杂任务，委托给专门的子代理
// 特点：独立的工具访问权限、会话隔离
// 示例：26-27-28-30-subagent-*.ts
```

## 🎨 系统提示（System Prompts）最佳实践

系统提示指导代理的行为和风格：

```typescript
// 角色定义
const systemPrompt = `
You are an expert code review agent. Your role is to:
1. Analyze code for quality and best practices
2. Identify potential bugs and performance issues
3. Suggest improvements with explanations
4. Follow company coding standards

Guidelines:
- Be constructive and helpful
- Consider context before suggesting changes
- Explain the 'why' behind recommendations
`;

agent.setSystemPrompt(systemPrompt);
```

## 📊 成本追踪与优化

使用 `37-cost-track.ts` 来监控 API 成本：
```typescript
// 追踪：
// - 每个请求的 token 使用
// - 输入 vs 输出 token 成本
// - 累计成本
// - 模型选择影响
```

## 🔐 安全最佳实践

### 1. 环境变量
```bash
# .env 文件（不要提交）
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. 工具限制
```typescript
// 限制代理访问的工具
const allowedTools = ["read_file", "grep"];
// 不允许访问危险工具如 bash 删除命令
```

### 3. 权限管理
```typescript
// 高危操作需要用户确认
permissionMode: "ask"  // 代替 "acceptEdits"
```

## 🚀 典型开发流程

### 1. 定义问题
```typescript
const prompt = "请审查这个 TypeScript 文件中的代码质量";
```

### 2. 创建代理
```typescript
const agent = new Agent({
  model: "claude-3-5-sonnet-20241022",
  tools: [...],
  systemPrompt: "你是一个代码审查专家",
  permissionMode: "ask"
});
```

### 3. 执行任务
```typescript
const result = await agent.query(prompt);
```

### 4. 处理结果
```typescript
if (result.success) {
  console.log(result.output);
} else {
  console.error(result.error);
}
```

### 5. 分析与优化
```typescript
// 使用成本追踪评估效率
// 根据日志优化提示词
// 调整权限设置
```

## 📝 编写新的示例/插件

当创建新的代理示例时，遵循这些约定：

```typescript
// 1. 导入必要的库
import { Anthropic } from "@anthropic-ai/sdk";
import * as fs from "fs";

// 2. 定义清晰的用途注释
/**
 * 示例：这是什么以及做什么
 * 关键特性：列出主要特性
 * 用途：何时使用这个模式
 */

// 3. 配置代理
const client = new Anthropic();
const tools = [/* ... */];

// 4. 执行任务
async function main() {
  // ...代码...
}

// 5. 错误处理
main().catch(console.error);
```

## 🔗 相关资源

- [Claude API 文档](https://docs.anthropic.com)
- [Agent SDK GitHub](https://github.com/anthropics/claude-agent-sdk)
- [MCP 规范](https://modelcontextprotocol.io/)
- [项目示例列表](./examples/README.md)

## 📌 关键速查表

| 概念 | 文件 | 用途 |
|-----|------|------|
| 基础查询 | 01-query-*.ts | 最简单的代理 |
| 文件编辑 | 02-write-*.ts | 自动修改文件 |
| 权限控制 | 05-08-permission-*.ts | 细粒度权限 |
| 会话管理 | 09-12-session-*.ts | 状态持久化 |
| 结构化输出 | 13-15-structured-*.ts | 类型安全输出 |
| 子代理 | 26-30-subagent-*.ts | 任务分解 |
| 成本追踪 | 37-cost-track.ts | 监控 API 成本 |

## 🎓 学习路径建议

### 初级（第 1 周）
1. 阅读 README.md 和本文件
2. 运行 01-query-basic-query.ts
3. 运行 02-write-modify-file.ts
4. 尝试修改提示词，观察代理行为变化

### 中级（第 2-3 周）
1. 学习权限和批准工作流（05-08）
2. 探索会话管理（09-12）
3. 实现结构化输出（13-15）
4. 创建第一个自定义代理

### 高级（第 4 周+）
1. 实现子代理系统（26-30）
2. 构建插件系统（plugins/）
3. 优化成本和性能（37）
4. 创建生产级别的代理应用

---

**提示**：本文档是为了帮助 AI 代理快速理解项目。如果你是人类用户，建议从 [README.md](./README.md) 和 [examples/README.md](./examples/README.md) 开始。
