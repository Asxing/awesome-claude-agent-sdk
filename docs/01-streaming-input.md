---
layout: default
title: 01. 流式输入
nav_order: 3
---

# 流式输入

## 概述

Claude Agent SDK 支持两种输入模式：
- **单次输入**：一次性发送完整的提示词
- **流式输入**：通过 AsyncGenerator 动态生成多轮对话

流式输入让你能够实现更复杂的交互场景，如：
- 根据 Agent 的响应动态调整后续输入
- 在对话过程中添加图片或其他媒体
- 实现类似聊天机器人的多轮对话

## 流式输入 vs 单次输入

### 单次输入

最简单的方式，适合一次性任务：

```typescript
for await (const message of query({
    prompt: "Explain the authentication flow",  // 字符串形式
    options: {
        allowedTools: ["Read", "Grep"],
    }
})) {
    if ("result" in message) {
        console.log(message.result);
    }
}
```

### 流式输入

使用 AsyncGenerator 动态生成消息：

```typescript
async function* generateMessages() {
    yield { type: "user", message: {...} };
    // 可以在这里等待条件、用户输入等
    await someCondition();
    yield { type: "user", message: {...} };  // 后续消息
}

for await (const message of query({
    prompt: generateMessages(),  // AsyncGenerator
    options: {...}
})) {
    // 处理响应
}
```

## 示例 1：多轮对话与图片支持

**文件：** `examples/03-input-streaming-input.ts`

```typescript
import { query } from "../lib/setup.js";
import { readFileSync } from "fs";

async function* generateMessages() {
    // 第一轮消息
    yield {
        type: "user" as const,
        message: {
            role: "user" as const,
            content: "Analyze this codebase for security issues"
        },
        parent_tool_use_id: null,
        session_id: ""
    };

    // 等待一段时间（模拟用户思考或条件判断）
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 第二轮消息：添加图片
    yield {
        type: "user" as const,
        message: {
            role: "user" as const,
            content: [
                {
                    type: "text" as const,
                    text: "Review this architecture diagram"
                },
                {
                    type: "image" as const,
                    source: {
                        type: "base64" as const,
                        media_type: "image/png" as const,
                        data: readFileSync("diagram.png", "base64")
                    }
                }
            ]
        },
        parent_tool_use_id: null,
        session_id: ""
    };
}

// 处理流式响应
for await (const message of query({
    prompt: generateMessages(),
    options: {
        maxTurns: 10,                    // 最大对话轮数
        allowedTools: ["Read", "Grep"]
    }
})) {
    if ("result" in message) {
        console.log(message.result);
    }
}
```

**代码解析：**

1. **AsyncGenerator 函数**：
   ```typescript
   async function* generateMessages() {
       yield message1;  // 第一条消息
       await condition; // 等待条件
       yield message2;  // 第二条消息
   }
   ```

2. **消息结构**：
   ```typescript
   {
       type: "user",              // 消息类型
       message: {
           role: "user",
           content: "..." | [...]  // 文本或多媒体内容
       },
       parent_tool_use_id: null,  // 父工具调用 ID
       session_id: ""             // 会话 ID
   }
   ```

3. **多媒体内容**：
   ```typescript
   content: [
       { type: "text", text: "..." },      // 文本
       { type: "image", source: {...} }    // 图片
   ]
   ```

4. **`maxTurns` 选项**：限制最大对话轮数，防止无限循环

**环境假设：**
- 示例中使用的 `diagram.png` 文件需要存在于项目目录中
- 图片会被自动转换为 base64 格式传输

## 示例 2：会话继续

**文件：** `examples/04-input-single-message-input.ts`

```typescript
import { query } from "../lib/setup.js";

// 第一次查询
for await (const message of query({
    prompt: "Explain the authentication flow",
    options: {
        allowedTools: ["Read", "Grep"],
    }
})) {
    if ("result" in message) {
        console.log("Result:", message.result);
    }
}

// 继续之前的会话
for await (const message of query({
    prompt: "Now explain the authorization process, 使用中文回答",
    options: {
        continue: true  // 继续上一个会话
    }
})) {
    if ("result" in message) {
        console.log(message.result);
    }
}
```

**代码解析：**

1. **`continue: true` 选项**：
   - 继续上一次查询的会话上下文
   - Agent 会记住之前的对话内容
   - 适合需要上下文连贯性的场景

2. **使用场景**：
   - 多步骤任务分解
   - 需要参考之前结果的后续操作
   - 渐进式需求澄清

## 图片支持详解

SDK 支持在消息中嵌入图片，用于视觉分析任务：

### 支持的图片格式

```typescript
{
    type: "image",
    source: {
        type: "base64",                    // Base64 编码
        media_type: "image/png" |          // PNG
                    "image/jpeg" |         // JPEG
                    "image/webp" |         // WebP
                    "image/gif",           // GIF
        data: "base64_encoded_data"        // Base64 数据
    }
}
```

### 从文件读取图片

```typescript
import { readFileSync } from "fs";

const imageData = readFileSync("diagram.png", "base64");

yield {
    type: "user",
    message: {
        role: "user",
        content: [
            { type: "text", text: "分析这张图片" },
            {
                type: "image",
                source: {
                    type: "base64",
                    media_type: "image/png",
                    data: imageData
                }
            }
        ]
    },
    parent_tool_use_id: null,
    session_id: ""
};
```

### 图片使用场景

- **架构图分析**：让 Agent 理解系统架构
- **UI 设计评审**：分析界面设计
- **错误截图诊断**：根据错误截图定位问题
- **数据可视化解读**：解释图表和数据

## 消息结构完整说明

### 用户消息

```typescript
{
    type: "user",
    message: {
        role: "user",
        content: string | Array<ContentBlock>
    },
    parent_tool_use_id: string | null,
    session_id: string
}
```

### 内容块类型

```typescript
// 文本块
{
    type: "text",
    text: string
}

// 图片块
{
    type: "image",
    source: {
        type: "base64",
        media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif",
        data: string  // Base64 编码
    }
}
```

## 实战：动态对话流程

结合流式输入和条件判断，实现智能对话：

```typescript
async function* interactiveSession() {
    // 初始查询
    yield {
        type: "user",
        message: {
            role: "user",
            content: "分析项目的测试覆盖率"
        },
        parent_tool_use_id: null,
        session_id: ""
    };

    // 等待 Agent 响应并分析结果
    // （实际应用中，你需要处理 Agent 的响应）
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 根据结果决定下一步
    const needsImprovement = true;  // 假设需要改进

    if (needsImprovement) {
        yield {
            type: "user",
            message: {
                role: "user",
                content: "请为覆盖率低于 80% 的文件编写测试"
            },
            parent_tool_use_id: null,
            session_id: ""
        };
    }
}

for await (const message of query({
    prompt: interactiveSession(),
    options: {
        maxTurns: 20,
        allowedTools: ["Read", "Write", "Bash", "Grep"]
    }
})) {
    // 处理消息
}
```

## 最佳实践

### 1. 合理设置 maxTurns

防止无限循环，保护 API 配额：

```typescript
options: {
    maxTurns: 10  // 根据任务复杂度调整
}
```

### 2. 优雅处理异步等待

在 Generator 中使用 await 等待条件：

```typescript
async function* generateMessages() {
    yield message1;

    // 等待用户输入
    const userInput = await getUserInput();

    yield {
        type: "user",
        message: { role: "user", content: userInput },
        parent_tool_use_id: null,
        session_id: ""
    };
}
```

### 3. 图片大小优化

压缩图片以减少 API 负载：

```typescript
// 建议：图片大小 < 5MB
// 分辨率：1024x1024 以内通常足够
```

### 4. 使用 continue 保持上下文

需要上下文连贯性时使用 `continue: true`：

```typescript
// 第一次查询
await query({ prompt: "步骤 1", options: {...} });

// 继续会话
await query({
    prompt: "基于上一步的结果，执行步骤 2",
    options: { continue: true }
});
```

## 常见问题

### Q: 何时使用流式输入？

**A:** 以下场景建议使用流式输入：
- 需要根据 Agent 响应调整后续输入
- 需要在对话中添加图片或文件
- 实现交互式工作流
- 需要等待外部条件（用户输入、API 响应等）

### Q: 如何处理 Agent 的中间响应？

**A:** 在 AsyncGenerator 中，你可以访问 Agent 的响应并做出决策：

```typescript
async function* smartConversation() {
    yield initialMessage;

    // 这里可以分析 Agent 的响应
    // 实际实现需要在消息循环中处理

    yield followUpMessage;
}
```

### Q: continue 和流式输入有什么区别？

**A:**
- **continue**: 继续上一个独立查询的会话
- **流式输入**: 在同一个查询中动态生成多轮对话

## 下一步

- [权限处理](./02-handling-permissions.md) - 学习如何管理工具执行权限
- [会话管理](./05-session-management.md) - 深入了解会话持久化

## 相关示例

- `examples/03-input-streaming-input.ts` - 流式输入与图片支持
- `examples/04-input-single-message-input.ts` - 会话继续
