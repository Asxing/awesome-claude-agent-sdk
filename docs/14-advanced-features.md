---
layout: default
title: 14. 高级特性
nav_order: 16
---

# 高级特性

## 概述

本章介绍 SDK 的高级功能，包括：
- 成本追踪和监控
- Todo 列表管理
- 插件系统
- 性能优化
- 调试技巧

## 成本追踪

**文件：** `examples/37-cost-track.ts`

监控 API 使用成本：

```typescript
import { query } from "../lib/setup.js";

class CostTracker {
    private processedMessageIds = new Set<string>();
    private stepUsages: Array<any> = [];

    async trackConversation(prompt: string) {
        const result = await query({
            prompt,
            options: {
                onMessage: (message) => {
                    this.processMessage(message);
                }
            }
        });

        return {
            result,
            stepUsages: this.stepUsages,
            totalCost: result.usage?.total_cost_usd || 0
        };
    }

    private processMessage(message: any) {
        // 只处理带使用量的 assistant 消息
        if (message.type !== 'assistant' || !message.usage) {
            return;
        }

        // 跳过已处理的消息
        if (this.processedMessageIds.has(message.id)) {
            return;
        }

        // 标记为已处理并记录使用量
        this.processedMessageIds.add(message.id);
        this.stepUsages.push({
            messageId: message.id,
            timestamp: new Date().toISOString(),
            usage: message.usage,
            costUSD: this.calculateCost(message.usage)
        });
    }

    private calculateCost(usage: any): number {
        // 实现定价计算
        const inputCost = usage.input_tokens * 0.00003;
        const outputCost = usage.output_tokens * 0.00015;
        const cacheReadCost = (usage.cache_read_input_tokens || 0) * 0.0000075;

        return inputCost + outputCost + cacheReadCost;
    }
}

// 使用
const tracker = new CostTracker();
const { result, stepUsages, totalCost } = await tracker.trackConversation(
    "Analyze and refactor this code"
);

console.log(`Steps processed: ${stepUsages.length}`);
console.log(`Total cost: $${totalCost.toFixed(4)}`);
```

**代码解析：**

1. **onMessage 回调**：
   ```typescript
   options: {
       onMessage: (message) => {
           // 处理每条消息
       }
   }
   ```

2. **使用量提取**：
   ```typescript
   if (message.type === 'assistant' && message.usage) {
       // message.usage 包含 token 使用量
   }
   ```

3. **成本计算**：
   ```typescript
   const inputCost = usage.input_tokens * 0.00003;
   const outputCost = usage.output_tokens * 0.00015;
   const cacheReadCost = (usage.cache_read_input_tokens || 0) * 0.0000075;
   ```

## Todo 列表监控

### 基础监控

**文件：** `examples/38-todo-list-monitor.ts`

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Optimize utils.py performance and track progress with todos",
    options: { maxTurns: 15 }
})) {
    // Todo 更新反映在消息流中
    if (message.type === "assistant") {
        for (const block of message.message.content) {
            if (block.type === "tool_use" && block.name === "TodoWrite") {
                const todos = block.input.todos;

                console.log("Todo Status Update:");
                todos.forEach((todo, index) => {
                    const status = todo.status === "completed" ? "✅" :
                        todo.status === "in_progress" ? "🔧" : "❌";
                    console.log(`${index + 1}. ${status} ${todo.content}`);
                });
            }
        }
    }
}
```

### 实时进度显示

**文件：** `examples/39-todo-list-real-time-progress-display.ts`

```typescript
import { query } from "../lib/setup.js";

class TodoTracker {
    private todos: any[] = [];

    displayProgress() {
        if (this.todos.length === 0) return;

        const completed = this.todos.filter(t => t.status === "completed").length;
        const inProgress = this.todos.filter(t => t.status === "in_progress").length;
        const total = this.todos.length;

        console.log(`\nProgress: ${completed}/${total} completed`);
        console.log(`Currently working on: ${inProgress} task(s)\n`);

        this.todos.forEach((todo, index) => {
            const icon = todo.status === "completed" ? "✅" :
                todo.status === "in_progress" ? "🔧" : "❌";
            const text = todo.status === "in_progress" ? todo.activeForm : todo.content;
            console.log(`${index + 1}. ${icon} ${text}`);
        });
    }

    async trackQuery(prompt: string) {
        for await (const message of query({
            prompt,
            options: { maxTurns: 20 }
        })) {
            if (message.type === "assistant") {
                for (const block of message.message.content) {
                    if (block.type === "tool_use" && block.name === "TodoWrite") {
                        this.todos = block.input.todos;
                        this.displayProgress();
                    }
                }
            }
        }
    }
}

// 使用
const tracker = new TodoTracker();
await tracker.trackQuery("Build a complete authentication system with todos");
```

**代码解析：**

1. **Todo 结构**：
   ```typescript
   {
       content: "任务描述",
       status: "pending" | "in_progress" | "completed",
       activeForm: "正在执行的描述"
   }
   ```

2. **进度计算**：
   ```typescript
   const completed = todos.filter(t => t.status === "completed").length;
   const progress = (completed / total) * 100;
   ```

3. **实时更新**：
   每次 TodoWrite 调用都触发进度显示更新。

## 消息流处理

### onMessage 回调

处理所有消息类型：

```typescript
for await (const message of query({
    prompt: "Perform complex task",
    options: {
        onMessage: (message) => {
            switch (message.type) {
                case 'system':
                    console.log('System:', message.subtype);
                    break;
                case 'user':
                    console.log('User:', message.message.content);
                    break;
                case 'assistant':
                    console.log('Assistant:', message.message.content);
                    break;
                case 'result':
                    console.log('Result:', message.result);
                    break;
            }
        }
    }
})) {
    // 消息也通过 for await 返回
}
```

### 消息类型

```typescript
// System 消息
{
    type: 'system',
    subtype: 'init' | 'checkpoint' | ...,
    session_id: string,
    slash_commands: string[],
    skills: string[]
}

// User 消息
{
    type: 'user',
    message: {
        role: 'user',
        content: string | Array<{type: 'text', text: string}>
    },
    uuid: string  // 检查点 ID
}

// Assistant 消息
{
    type: 'assistant',
    message: {
        role: 'assistant',
        content: Array<{
            type: 'text' | 'tool_use',
            text?: string,
            name?: string,
            input?: any
        }>
    },
    usage: {
        input_tokens: number,
        output_tokens: number,
        cache_read_input_tokens: number
    }
}

// Result 消息
{
    type: 'result',
    subtype: 'success' | 'error',
    result: string,
    usage: { ... },
    session_id: string
}
```

## 性能优化

### 1. 使用缓存

启用提示缓存：

```typescript
options: {
    // SDK 自动使用提示缓存
    // cache_read_input_tokens 在 usage 中显示
}
```

### 2. 限制轮次

```typescript
options: {
    maxTurns: 5  // 限制最多 5 轮对话
}
```

### 3. 选择合适的模型

```typescript
// 简单任务使用 Haiku
options: {
    model: 'haiku'  // 快速且便宜
}

// 复杂任务使用 Sonnet
options: {
    model: 'sonnet'  // 平衡性能
}

// 最复杂任务使用 Opus
options: {
    model: 'opus'  // 最强大
}
```

### 4. 工具限制

只允许必要的工具：

```typescript
// ✅ 好的做法
allowedTools: ['Read', 'Grep']  // 只读任务

// ❌ 避免
allowedTools: ['*']  // 所有工具
```

## 调试技巧

### 1. 详细日志

```typescript
for await (const message of query({
    prompt: "Debug this issue",
    options: {
        onMessage: (message) => {
            console.log(JSON.stringify(message, null, 2));
        }
    }
})) {
    // 查看所有消息细节
}
```

### 2. 工具调用追踪

```typescript
if (message.type === 'assistant') {
    for (const block of message.message.content) {
        if (block.type === 'tool_use') {
            console.log(`Tool: ${block.name}`);
            console.log(`Input: ${JSON.stringify(block.input)}`);
        }
    }
}
```

### 3. 错误捕获

```typescript
try {
    for await (const message of query({
        prompt: "Risky operation"
    })) {
        // 处理消息
    }
} catch (error) {
    console.error('Query failed:', error);
    console.error('Stack:', error.stack);
}
```

## 高级配置

### 完整配置示例

```typescript
for await (const message of query({
    prompt: "Complex task",
    options: {
        // 模型配置
        model: 'sonnet',
        maxTurns: 10,

        // 权限配置
        permissionMode: 'acceptEdits',
        allowedTools: ['Read', 'Edit', 'Grep', 'Task'],

        // 工具配置
        mcpServers: {
            'custom-server': {
                command: 'node',
                args: ['./server.js']
            }
        },

        // 子代理配置
        agents: {
            'specialist': {
                description: 'Specialized agent',
                prompt: '...',
                tools: ['Read'],
                model: 'opus'
            }
        },

        // 系统提示词
        systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
            append: 'Additional instructions...'
        },

        // 设置源
        settingSources: ['user', 'project'],

        // 输出格式
        outputFormat: {
            type: 'json_schema',
            schema: { ... }
        },

        // 文件检查点
        enableFileCheckpointing: true,
        extraArgs: { 'replay-user-messages': null },
        env: {
            ...process.env,
            CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1'
        },

        // 会话管理
        resume: sessionId,
        forkSession: false,

        // 回调
        onMessage: (message) => {
            // 处理消息
        },

        // 钩子
        hooks: {
            PreToolUse: [
                {
                    matcher: 'Write|Edit',
                    hooks: [protectFiles]
                }
            ]
        },

        // 审批
        canUseTool: async (toolName, input) => {
            return { behavior: 'allow', updatedInput: input };
        }
    }
})) {
    // 处理消息
}
```

## 实战场景

### 场景 1：成本控制

```typescript
class CostController {
    private maxCost = 0.10;  // $0.10 限制
    private currentCost = 0;

    async runWithBudget(prompt: string) {
        for await (const message of query({
            prompt,
            options: {
                onMessage: (msg) => {
                    if (msg.type === 'assistant' && msg.usage) {
                        const cost = this.calculateCost(msg.usage);
                        this.currentCost += cost;

                        if (this.currentCost > this.maxCost) {
                            throw new Error('Budget exceeded');
                        }
                    }
                }
            }
        })) {
            // 处理消息
        }

        console.log(`Total cost: $${this.currentCost.toFixed(4)}`);
    }

    private calculateCost(usage: any): number {
        return usage.input_tokens * 0.00003 +
               usage.output_tokens * 0.00015;
    }
}
```

### 场景 2：进度监控

```typescript
class ProgressMonitor {
    private startTime = Date.now();
    private steps = 0;

    async monitor(prompt: string) {
        for await (const message of query({
            prompt,
            options: {
                onMessage: (msg) => {
                    if (msg.type === 'assistant') {
                        this.steps++;
                        const elapsed = (Date.now() - this.startTime) / 1000;
                        console.log(`Step ${this.steps} (${elapsed.toFixed(1)}s)`);
                    }
                }
            }
        })) {
            // 处理消息
        }

        const totalTime = (Date.now() - this.startTime) / 1000;
        console.log(`Completed in ${totalTime.toFixed(1)}s (${this.steps} steps)`);
    }
}
```

### 场景 3：错误恢复

```typescript
async function resilientQuery(prompt: string, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const results = [];

            for await (const message of query({ prompt })) {
                results.push(message);
            }

            return results;
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) {
                throw new Error(`Failed after ${maxRetries} attempts`);
            }

            // 指数退避
            await new Promise(resolve =>
                setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
        }
    }
}
```

## 性能指标

### 监控关键指标

```typescript
class PerformanceMonitor {
    private metrics = {
        totalTokens: 0,
        totalCost: 0,
        totalTime: 0,
        toolCalls: 0,
        cacheHits: 0
    };

    async track(prompt: string) {
        const startTime = Date.now();

        for await (const message of query({
            prompt,
            options: {
                onMessage: (msg) => {
                    if (msg.type === 'assistant') {
                        // Token 统计
                        if (msg.usage) {
                            this.metrics.totalTokens +=
                                msg.usage.input_tokens +
                                msg.usage.output_tokens;

                            this.metrics.cacheHits +=
                                msg.usage.cache_read_input_tokens || 0;

                            this.metrics.totalCost += this.calculateCost(msg.usage);
                        }

                        // 工具调用统计
                        for (const block of msg.message.content) {
                            if (block.type === 'tool_use') {
                                this.metrics.toolCalls++;
                            }
                        }
                    }
                }
            }
        })) {
            // 处理消息
        }

        this.metrics.totalTime = (Date.now() - startTime) / 1000;

        return this.metrics;
    }

    private calculateCost(usage: any): number {
        return usage.input_tokens * 0.00003 +
               usage.output_tokens * 0.00015 +
               (usage.cache_read_input_tokens || 0) * 0.0000075;
    }
}

// 使用
const monitor = new PerformanceMonitor();
const metrics = await monitor.track("Complex task");

console.log('Performance Metrics:');
console.log(`- Total tokens: ${metrics.totalTokens}`);
console.log(`- Cache hits: ${metrics.cacheHits}`);
console.log(`- Tool calls: ${metrics.toolCalls}`);
console.log(`- Total cost: $${metrics.totalCost.toFixed(4)}`);
console.log(`- Total time: ${metrics.totalTime.toFixed(2)}s`);
```

## 最佳实践

### 1. 成本监控

始终监控 API 使用成本：

```typescript
options: {
    onMessage: (msg) => {
        if (msg.usage) {
            logUsage(msg.usage);
        }
    }
}
```

### 2. 错误处理

实现完善的错误处理：

```typescript
try {
    for await (const message of query({ prompt })) {
        // 处理消息
    }
} catch (error) {
    // 记录错误
    logger.error('Query failed', { error, prompt });
    // 通知用户
    // 尝试恢复
}
```

### 3. 超时控制

设置合理的超时：

```typescript
const timeout = 60000;  // 60 秒

const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeout)
);

const queryPromise = (async () => {
    for await (const message of query({ prompt })) {
        // 处理消息
    }
})();

await Promise.race([queryPromise, timeoutPromise]);
```

## 常见问题

### Q: 如何减少 API 成本？

**A:**
1. 使用更便宜的模型（Haiku）
2. 限制 maxTurns
3. 使用提示缓存
4. 精确的工具白名单

### Q: 如何提高响应速度？

**A:**
1. 使用 Haiku 模型
2. 减少工具数量
3. 优化系统提示词长度
4. 使用流式输出

### Q: 如何调试复杂问题？

**A:**
1. 启用详细日志
2. 使用 onMessage 追踪
3. 检查工具调用序列
4. 分析 usage 数据

## 总结

本教程涵盖了 Claude Agent SDK 的所有核心功能：

1. **基础功能** (00-02)
   - SDK 简介和安装
   - 流式输入和多轮对话
   - 权限管理

2. **控制机制** (03-06)
   - 用户审批和输入
   - 钩子函数
   - 会话管理
   - 文件检查点

3. **数据处理** (07-08)
   - 结构化输出
   - 系统提示词

4. **扩展能力** (09-11)
   - MCP 服务器
   - 自定义工具
   - 子代理

5. **便捷功能** (12-14)
   - 斜杠命令
   - 技能系统
   - 高级特性

## 相关示例

- `examples/37-cost-track.ts` - 成本追踪
- `examples/38-todo-list-monitor.ts` - Todo 监控
- `examples/39-todo-list-real-time-progress-display.ts` - 实时进度
- `examples/40-plugin-load-commands.ts` - 插件加载
