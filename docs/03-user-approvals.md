---
layout: default
title: 用户审批与输入
nav_order: 5
parent: 基础入门
---

# 用户审批与输入

## 概述

除了基本的权限模式，SDK 还提供了更精细的审批控制机制，通过 `canUseTool` 回调函数，你可以：
- 自定义每个工具调用的审批逻辑
- 修改工具的输入参数
- 处理 Agent 的澄清问题（AskUserQuestion）
- 实现复杂的权限决策流程

## canUseTool 回调函数

### 函数签名

```typescript
canUseTool: async (
    toolName: string,
    input: Record<string, unknown>
) => Promise<{
    behavior: "allow" | "deny",
    updatedInput?: Record<string, unknown>,
    message?: string
}>
```

### 返回值说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `behavior` | `"allow"` \| `"deny"` | 是否允许执行 |
| `updatedInput` | `object` | 修改后的输入参数（可选） |
| `message` | `string` | 拒绝时的说明信息（可选） |

## 示例 1：交互式工具审批

**文件：** `examples/07-approval-handle-tool-approval-requests.ts`

```typescript
import { query } from "../lib/setup.js";
import * as readline from "readline";

// 辅助函数：获取用户输入
function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        })
    );
}

for await (const message of query({
    prompt: "Create a test file in /tmp and then delete it",
    options: {
        canUseTool: async (toolName, input: Record<string, unknown>) => {
            // 显示工具请求信息
            console.log(`\nTool: ${toolName}`);
            if (toolName === "Bash") {
                console.log(`Command: ${input.command}`);
                if (input.description) {
                    console.log(`Description: ${input.description}`);
                }
            } else {
                console.log(`Input: ${JSON.stringify(input, null, 2)}`);
            }

            // 获取用户确认
            const response = await prompt("Allow this action? (y/n): ");

            if (response.toLowerCase() === "y") {
                // 允许执行
                return { behavior: "allow" as const, updatedInput: input };
            } else {
                // 拒绝执行
                return {
                    behavior: "deny" as const,
                    message: "User denied this action"
                };
            }
        },
    },
})) {
    if ("result" in message) console.log(message.result);
}
```

**代码解析：**

1. **`canUseTool` 回调**：每次工具调用前触发
2. **显示工具信息**：让用户了解 Agent 要做什么
3. **用户交互**：通过 readline 获取用户确认
4. **返回决策**：
   - `behavior: "allow"` - 允许执行
   - `behavior: "deny"` - 拒绝执行，并附带说明

### 修改工具输入

你还可以修改工具的输入参数：

```typescript
canUseTool: async (toolName, input) => {
    if (toolName === "Bash") {
        // 将所有命令限制在沙箱目录
        const sandboxedInput = {
            ...input,
            command: input.command.replace("/tmp", "/tmp/sandbox")
        };
        return {
            behavior: "allow" as const,
            updatedInput: sandboxedInput
        };
    }
    return { behavior: "allow" as const, updatedInput: input };
}
```

## 示例 2：处理澄清问题

**文件：** `examples/08-approval-handle-clarifying-questions.ts`

当 Agent 需要用户做出选择时，会使用 `AskUserQuestion` 工具：

```typescript
import * as readline from "readline";
import { query } from "../lib/setup.js";

// 辅助函数：获取用户输入
function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        })
    );
}

for await (const message of query({
    prompt: "Help me decide on the tech stack for a new mobile app",
    options: {
        canUseTool: async (toolName, input) => {
            // 处理 Agent 的澄清问题
            if (toolName === "AskUserQuestion") {
                const answers: Record<string, string> = {};

                // 遍历每个问题
                for (const q of input.questions) {
                    console.log(`\n${q.question}`);

                    // 显示选项
                    q.options.forEach((opt: any, i: number) => {
                        console.log(`  ${i + 1}. ${opt.label} - ${opt.description}`);
                    });

                    // 获取用户输入
                    const response = await prompt("Your choice (number or text): ");

                    // 解析响应：如果是数字则取对应选项，否则用原始输入
                    const index = parseInt(response) - 1;
                    answers[q.question] = (index >= 0 && index < q.options.length)
                        ? q.options[index].label
                        : response;
                }

                // 返回答案（必须包含原始问题）
                return {
                    behavior: "allow" as const,
                    updatedInput: { questions: input.questions, answers }
                };
            }

            // 其他工具自动批准
            return { behavior: "allow" as const, updatedInput: input };
        }
    }
})) {
    if ("result" in message) console.log(message.result);
}
```

**代码解析：**

1. **`AskUserQuestion` 工具**：Agent 用来向用户提问的特殊工具
2. **问题结构**：
   ```typescript
   {
       questions: [{
           header: "Tech Stack",
           question: "Which framework do you prefer?",
           options: [
               { label: "React Native", description: "..." },
               { label: "Flutter", description: "..." }
           ],
           multiSelect: false  // 是否允许多选
       }]
   }
   ```

3. **答案收集**：
   - 用户可以选择数字选项
   - 也可以输入自由文本
   - 多选题支持逗号分隔

4. **返回格式**：
   ```typescript
   {
       behavior: "allow",
       updatedInput: {
           questions: originalQuestions,  // 必须包含原始问题
           answers: {
               "问题文本": "答案"
           }
       }
   }
   ```

## AskUserQuestion 工具详解

### 问题格式

```typescript
{
    questions: [
        {
            header: string,        // 简短标题（最多 12 字符）
            question: string,      // 完整问题
            options: [
                {
                    label: string,        // 选项标签
                    description: string   // 选项说明
                }
            ],
            multiSelect: boolean   // 是否允许多选
        }
    ]
}
```

### 答案格式

```typescript
{
    answers: {
        "问题文本": "用户的答案"
    }
}
```

## 审批决策流程

```
工具调用请求
    ↓
canUseTool 回调触发
    ↓
分析工具名称和输入
    ↓
┌─────────────┬──────────────┬──────────────┐
│   允许      │   拒绝       │  修改后允许  │
│ behavior:   │ behavior:    │ behavior:    │
│ "allow"     │ "deny"       │ "allow"      │
│             │ message: "…" │ updatedInput │
└─────────────┴──────────────┴──────────────┘
    ↓              ↓               ↓
执行工具      跳过执行      用新参数执行
```

## 实战场景

### 场景 1：命令沙箱化

限制 Bash 命令只能在特定目录执行：

```typescript
canUseTool: async (toolName, input) => {
    if (toolName === "Bash") {
        // 自动将路径限制在沙箱目录
        const sandboxedInput = {
            ...input,
            command: input.command.replace("/tmp", "/tmp/sandbox")
        };
        return {
            behavior: "allow" as const,
            updatedInput: sandboxedInput
        };
    }
    return { behavior: "allow" as const, updatedInput: input };
}
```

### 场景 2：危险操作拦截

自动拒绝危险命令：

```typescript
canUseTool: async (toolName, input) => {
    if (toolName === "Bash") {
        const dangerousCommands = ["rm -rf", "sudo", "chmod 777"];
        const command = input.command as string;

        if (dangerousCommands.some(cmd => command.includes(cmd))) {
            return {
                behavior: "deny" as const,
                message: "Dangerous command blocked for safety"
            };
        }
    }
    return { behavior: "allow" as const, updatedInput: input };
}
```

### 场景 3：条件性自动批准

根据工具类型和参数决定是否需要确认：

```typescript
canUseTool: async (toolName, input) => {
    // 只读工具自动批准
    if (["Read", "Grep", "Glob"].includes(toolName)) {
        return { behavior: "allow" as const, updatedInput: input };
    }

    // 文件编辑：小文件自动批准，大文件需确认
    if (toolName === "Edit") {
        const fileSize = getFileSize(input.file_path);
        if (fileSize < 1000) {  // 小于 1KB
            return { behavior: "allow" as const, updatedInput: input };
        }
    }

    // 其他情况请求用户确认
    const response = await prompt(`Allow ${toolName}? (y/n): `);
    return response === "y"
        ? { behavior: "allow" as const, updatedInput: input }
        : { behavior: "deny" as const, message: "User denied" };
}
```

## 高级用法

### 1. 日志记录

记录所有工具调用：

```typescript
canUseTool: async (toolName, input) => {
    // 记录到日志
    console.log(`[${new Date().toISOString()}] Tool: ${toolName}`);
    console.log(`Input: ${JSON.stringify(input)}`);

    return { behavior: "allow" as const, updatedInput: input };
}
```

### 2. 审计追踪

构建审计记录：

```typescript
const auditLog: any[] = [];

canUseTool: async (toolName, input) => {
    const entry = {
        timestamp: new Date(),
        tool: toolName,
        input: input,
        approved: true
    };

    auditLog.push(entry);

    return { behavior: "allow" as const, updatedInput: input };
}
```

### 3. 条件性参数注入

根据环境自动调整参数：

```typescript
canUseTool: async (toolName, input) => {
    if (toolName === "Bash") {
        // 在开发环境添加 verbose 标志
        if (process.env.NODE_ENV === "development") {
            return {
                behavior: "allow" as const,
                updatedInput: {
                    ...input,
                    command: `${input.command} --verbose`
                }
            };
        }
    }
    return { behavior: "allow" as const, updatedInput: input };
}
```

## AskUserQuestion 实战

### 问题类型

#### 单选题

```typescript
{
    header: "Framework",
    question: "Which framework do you prefer?",
    options: [
        { label: "React", description: "Popular and mature" },
        { label: "Vue", description: "Progressive framework" },
        { label: "Angular", description: "Full-featured" }
    ],
    multiSelect: false  // 单选
}
```

#### 多选题

```typescript
{
    header: "Features",
    question: "Which features do you need?",
    options: [
        { label: "Authentication", description: "User login system" },
        { label: "Payment", description: "Payment integration" },
        { label: "Analytics", description: "Usage tracking" }
    ],
    multiSelect: true  // 多选
}
```

### 用户输入处理

```typescript
function parseResponse(response: string, options: any[]): string {
    // 尝试解析为数字选项
    const indices = response.split(",").map((s) => parseInt(s.trim()) - 1);
    const labels = indices
        .filter((i) => !isNaN(i) && i >= 0 && i < options.length)
        .map((i) => options[i].label);

    // 如果是有效的数字选项，返回标签；否则返回原始输入
    return labels.length > 0 ? labels.join(", ") : response;
}
```

**支持的输入格式：**
- `1` - 选择第一个选项
- `1,3` - 选择第一和第三个选项（多选）
- `Custom answer` - 自由文本输入

## 完整工作流程示例

```typescript
async function main() {
    const approvalHistory: any[] = [];

    for await (const message of query({
        prompt: "设计一个新的微服务架构",
        options: {
            canUseTool: async (toolName, input) => {
                // 处理 AskUserQuestion
                if (toolName === "AskUserQuestion") {
                    return handleAskUserQuestion(input);
                }

                // 记录审批历史
                console.log(`\n[审批请求] ${toolName}`);
                console.log(`参数: ${JSON.stringify(input, null, 2)}`);

                // 危险操作自动拒绝
                if (toolName === "Bash" && input.command.includes("rm -rf")) {
                    approvalHistory.push({
                        tool: toolName,
                        approved: false,
                        reason: "Dangerous command"
                    });
                    return {
                        behavior: "deny" as const,
                        message: "危险命令已被拦截"
                    };
                }

                // 其他操作请求确认
                const response = await prompt("是否允许? (y/n): ");
                const approved = response.toLowerCase() === "y";

                approvalHistory.push({
                    tool: toolName,
                    input: input,
                    approved: approved,
                    timestamp: new Date()
                });

                return approved
                    ? { behavior: "allow" as const, updatedInput: input }
                    : { behavior: "deny" as const, message: "用户拒绝" };
            },
        },
    })) {
        if ("result" in message) {
            console.log("\n任务完成！");
            console.log("审批历史:", approvalHistory);
        }
    }
}
```

## 最佳实践

### 1. 提供清晰的审批信息

```typescript
// ✅ 好的做法：显示详细信息
console.log(`Tool: ${toolName}`);
console.log(`Command: ${input.command}`);
console.log(`Description: ${input.description}`);

// ❌ 避免：信息不足
console.log("Approve?");
```

### 2. 实现超时机制

防止用户长时间未响应：

```typescript
async function promptWithTimeout(question: string, timeout = 30000) {
    return Promise.race([
        prompt(question),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeout)
        )
    ]);
}
```

### 3. 优雅处理拒绝

提供有意义的拒绝消息：

```typescript
return {
    behavior: "deny" as const,
    message: "操作被拒绝：文件大小超过限制（最大 10MB）"
};
```

### 4. 分类处理不同工具

```typescript
canUseTool: async (toolName, input) => {
    // 只读工具自动批准
    if (["Read", "Grep", "Glob"].includes(toolName)) {
        return { behavior: "allow" as const, updatedInput: input };
    }

    // 特殊工具特殊处理
    if (toolName === "AskUserQuestion") {
        return handleAskUserQuestion(input);
    }

    // 默认请求确认
    return await requestUserApproval(toolName, input);
}
```

## 常见问题

### Q: canUseTool 和 permissionMode 有什么区别？

**A:**
- **permissionMode**: 粗粒度的权限控制（ask/acceptEdits/acceptAll）
- **canUseTool**: 细粒度的自定义审批逻辑

两者可以同时使用，`canUseTool` 的优先级更高。

### Q: 如何处理异步审批？

**A:** `canUseTool` 是 async 函数，可以包含任何异步操作：

```typescript
canUseTool: async (toolName, input) => {
    // 可以调用外部 API
    const approval = await externalApprovalService.check(toolName, input);

    return approval
        ? { behavior: "allow", updatedInput: input }
        : { behavior: "deny", message: "External service denied" };
}
```

### Q: 能否在审批时修改多个参数？

**A:** 可以，返回完整的 `updatedInput` 对象：

```typescript
return {
    behavior: "allow" as const,
    updatedInput: {
        ...input,
        command: modifiedCommand,
        timeout: 60000,
        description: "Modified by approval system"
    }
};
```

## 下一步

- [钩子函数](./04-hooks.md) - 更强大的拦截和控制机制
- [会话管理](./05-session-management.md) - 持久化对话上下文

## 相关示例

- `examples/07-approval-handle-tool-approval-requests.ts` - 交互式工具审批
- `examples/08-approval-handle-clarifying-questions.ts` - 处理澄清问题
