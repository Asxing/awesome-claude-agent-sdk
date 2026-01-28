---
layout: default
title: 04. 钩子函数
nav_order: 6
---

# 钩子函数

## 概述

钩子（Hooks）是 SDK 提供的强大拦截机制，允许你在 Agent 执行流程的关键节点介入，实现：
- 阻止特定操作（如保护敏感文件）
- 记录和审计工具调用
- 修改工具参数
- 实现自定义安全策略

与 `canUseTool` 相比，Hooks 更底层、更灵活，可以拦截更多类型的事件。

## 钩子系统架构

```
Agent 执行流程
    ↓
┌─────────────────────────────┐
│   PreToolUse Hook           │  ← 工具调用前触发
│   (可以拦截/修改/记录)      │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│   工具执行                   │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│   PostToolUse Hook          │  ← 工具调用后触发
│   (可以记录结果)            │
└─────────────────────────────┘
```

## 钩子类型

| 钩子类型 | 触发时机 | 主要用途 |
|---------|---------|---------|
| `PreToolUse` | 工具调用前 | 拦截、修改参数、安全检查 |
| `PostToolUse` | 工具调用后 | 记录结果、审计日志 |
| `PreMessage` | 消息发送前 | 修改用户输入 |
| `PostMessage` | 消息接收后 | 处理 Agent 响应 |

## 示例：保护敏感文件

**文件：** `examples/08-hooks-intercept-control-angent-with-hooks.ts`

```typescript
import { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { query } from "../lib/setup.js";

// 定义钩子回调函数
const protectEnvFiles: HookCallback = async (input, toolUseID, { signal }) => {
    // 类型转换以获得类型安全
    const preInput = input as PreToolUseHookInput;

    // 从工具输入中提取文件路径
    const filePath = preInput.tool_input?.file_path as string;
    const fileName = filePath?.split('/').pop();

    // 如果目标是 .env 文件，拒绝操作
    if (fileName === '.env') {
        return {
            hookSpecificOutput: {
                hookEventName: input.hook_event_name,
                permissionDecision: 'deny',
                permissionDecisionReason: 'Cannot modify .env files'
            }
        };
    }

    // 返回空对象表示允许操作
    return {};
};

for await (const message of query({
    prompt: "Update the MESSAGE_LOGS configuration to false in .env file",
    options: {
        hooks: {
            // 注册 PreToolUse 钩子
            // matcher 过滤只拦截 Write 和 Edit 工具
            PreToolUse: [{ matcher: 'Write|Edit', hooks: [protectEnvFiles] }]
        }
    }
})) {
    console.log(message);
}
```

**代码解析：**

1. **钩子函数签名**：
   ```typescript
   HookCallback = async (
       input: HookInput,           // 钩子输入数据
       toolUseID: string,          // 工具调用 ID
       context: { signal: AbortSignal }  // 上下文（可用于取消）
   ) => Promise<HookOutput>
   ```

2. **PreToolUseHookInput 结构**：
   ```typescript
   {
       hook_event_name: "PreToolUse",
       tool_name: "Write" | "Edit" | ...,
       tool_input: {
           file_path: string,
           content?: string,
           ...
       }
   }
   ```

3. **拦截决策**：
   - **拒绝操作**：返回 `permissionDecision: 'deny'`
   - **允许操作**：返回空对象 `{}`
   - **修改参数**：返回修改后的 `tool_input`

4. **Matcher 语法**：
   ```typescript
   matcher: 'Write|Edit'  // 正则表达式，匹配工具名称
   ```

## 钩子配置详解

### 基本配置结构

```typescript
options: {
    hooks: {
        PreToolUse: [
            {
                matcher: string,        // 工具名称匹配模式（正则）
                hooks: HookCallback[]   // 钩子回调函数数组
            }
        ],
        PostToolUse: [...],
        PreMessage: [...],
        PostMessage: [...]
    }
}
```

### Matcher 语法详解

`matcher` 是一个正则表达式字符串，用于匹配工具名称。SDK 会将工具名称与 matcher 进行正则匹配，决定是否触发钩子。

#### 基础语法

```typescript
// 1. 匹配单个工具（精确匹配）
matcher: 'Write'           // 只匹配 Write 工具
matcher: 'Edit'            // 只匹配 Edit 工具

// 2. 匹配多个工具（使用 | 操作符）
matcher: 'Write|Edit'      // 匹配 Write 或 Edit
matcher: 'Write|Edit|Bash' // 匹配 Write、Edit 或 Bash

// 3. 匹配所有工具（通配符）
matcher: '.*'              // 匹配任何工具名称

// 4. 匹配特定前缀
matcher: 'Web.*'           // 匹配 WebSearch、WebFetch 等
matcher: 'Todo.*'          // 匹配 TodoWrite、TodoRead 等

// 5. 匹配特定后缀
matcher: '.*Write'         // 匹配 Write、TodoWrite 等
matcher: '.*Edit'          // 匹配 Edit、NotebookEdit 等
```

#### 高级语法

```typescript
// 使用字符类
matcher: '[WE]rite'        // 匹配 Write（但不匹配 Edit）

// 使用可选字符
matcher: 'Bash|Grep|Glob'  // 匹配命令行相关工具

// 排除特定工具（需要负向前瞻，复杂场景）
// 注意：通常直接在钩子函数中判断更清晰
matcher: '(?!Read).*'      // 匹配除 Read 外的所有工具
```

#### 实战示例

```typescript
// 示例 1：保护所有写操作
{
    matcher: 'Write|Edit',
    hooks: [protectFiles]
}

// 示例 2：监控所有工具调用
{
    matcher: '.*',
    hooks: [auditTool]
}

// 示例 3：限制命令行工具
{
    matcher: 'Bash|Grep|Glob',
    hooks: [validateCommand]
}

// 示例 4：Web 相关工具
{
    matcher: 'Web.*',
    hooks: [checkNetworkAccess]
}
```

#### 常见错误

```typescript
// ❌ 错误：忘记转义特殊字符
matcher: '.'               // 匹配任意单个字符，不是字面的 '.'
matcher: '\\.'             // 正确：匹配字面的 '.'

// ❌ 错误：使用 glob 语法而非正则
matcher: 'Write*'          // 这不是通配符！应该用 'Write.*'
matcher: 'Write.*'         // 正确：匹配 Write 开头的工具

// ✅ 正确：清晰的正则表达式
matcher: 'Write|Edit'      // 匹配 Write 或 Edit
matcher: '.*'              // 匹配所有工具
```

## 实战场景

### 场景 1：文件保护

保护敏感文件不被修改：

```typescript
const protectSensitiveFiles: HookCallback = async (input) => {
    const preInput = input as PreToolUseHookInput;
    const filePath = preInput.tool_input?.file_path as string;

    const sensitivePatterns = [
        /\.env$/,
        /\.secret$/,
        /credentials/,
        /private_key/
    ];

    if (sensitivePatterns.some(pattern => pattern.test(filePath))) {
        return {
            hookSpecificOutput: {
                hookEventName: input.hook_event_name,
                permissionDecision: 'deny',
                permissionDecisionReason: `Protected file: ${filePath}`
            }
        };
    }

    return {};
};

options: {
    hooks: {
        PreToolUse: [
            { matcher: 'Write|Edit', hooks: [protectSensitiveFiles] }
        ]
    }
}
```

### 场景 2：命令白名单

只允许执行特定的 Bash 命令：

```typescript
const whitelistCommands: HookCallback = async (input) => {
    const preInput = input as PreToolUseHookInput;
    const command = preInput.tool_input?.command as string;

    const allowedCommands = ['ls', 'cat', 'grep', 'find', 'echo'];
    const firstWord = command.trim().split(/\s+/)[0];

    if (!allowedCommands.includes(firstWord)) {
        return {
            hookSpecificOutput: {
                hookEventName: input.hook_event_name,
                permissionDecision: 'deny',
                permissionDecisionReason: `Command '${firstWord}' not in whitelist`
            }
        };
    }

    return {};
};

options: {
    hooks: {
        PreToolUse: [
            { matcher: 'Bash', hooks: [whitelistCommands] }
        ]
    }
}
```

### 场景 3：操作审计

记录所有工具调用：

```typescript
const auditLog: any[] = [];

const auditToolUse: HookCallback = async (input, toolUseID) => {
    const preInput = input as PreToolUseHookInput;

    auditLog.push({
        timestamp: new Date().toISOString(),
        toolUseID: toolUseID,
        toolName: preInput.tool_name,
        toolInput: preInput.tool_input
    });

    console.log(`[Audit] ${preInput.tool_name} called at ${new Date().toISOString()}`);

    return {};  // 允许操作继续
};

options: {
    hooks: {
        PreToolUse: [
            { matcher: '.*', hooks: [auditToolUse] }  // 拦截所有工具
        ]
    }
}
```

### 场景 4：参数修改

自动修改工具参数：

```typescript
const sandboxPaths: HookCallback = async (input) => {
    const preInput = input as PreToolUseHookInput;

    if (preInput.tool_input?.file_path) {
        // 将所有文件操作限制在沙箱目录
        const originalPath = preInput.tool_input.file_path as string;
        const sandboxedPath = `/sandbox${originalPath}`;

        return {
            hookSpecificOutput: {
                hookEventName: input.hook_event_name,
                tool_input: {
                    ...preInput.tool_input,
                    file_path: sandboxedPath
                }
            }
        };
    }

    return {};
};

options: {
    hooks: {
        PreToolUse: [
            { matcher: 'Write|Edit|Read', hooks: [sandboxPaths] }
        ]
    }
}
```

### 场景 5：多钩子组合

同时应用多个钩子：

```typescript
const logTool: HookCallback = async (input) => {
    console.log(`[Log] Tool: ${(input as PreToolUseHookInput).tool_name}`);
    return {};
};

const validateTool: HookCallback = async (input) => {
    // 验证逻辑...
    return {};
};

const rateLimitTool: HookCallback = async (input) => {
    // 速率限制逻辑...
    return {};
};

options: {
    hooks: {
        PreToolUse: [
            {
                matcher: '.*',
                hooks: [logTool, validateTool, rateLimitTool]  // 按顺序执行
            }
        ]
    }
}
```

## PostToolUse 钩子

记录工具执行结果：

```typescript
const logResults: HookCallback = async (input) => {
    const postInput = input as PostToolUseHookInput;

    console.log(`[Result] Tool: ${postInput.tool_name}`);
    console.log(`Status: ${postInput.tool_result.success ? 'Success' : 'Failed'}`);
    console.log(`Output: ${JSON.stringify(postInput.tool_result.output)}`);

    return {};
};

options: {
    hooks: {
        PostToolUse: [
            { matcher: '.*', hooks: [logResults] }
        ]
    }
}
```

## 钩子返回值详解

### 允许操作

```typescript
return {};  // 空对象表示允许
```

### 拒绝操作

```typescript
return {
    hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        permissionDecision: 'deny',
        permissionDecisionReason: '拒绝原因说明'
    }
};
```

### 修改参数

```typescript
return {
    hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        tool_input: {
            ...originalInput,
            // 修改的字段
            file_path: '/new/path',
            timeout: 60000
        }
    }
};
```

### 取消操作

使用 AbortSignal 取消：

```typescript
const timeoutHook: HookCallback = async (input, toolUseID, { signal }) => {
    // 设置超时
    setTimeout(() => {
        if (!signal.aborted) {
            // 触发取消
            console.log('Operation timed out');
        }
    }, 5000);

    return {};
};
```

## Hooks vs canUseTool

| 特性 | Hooks | canUseTool |
|------|-------|------------|
| 拦截时机 | 多种事件（Pre/Post） | 仅工具调用前 |
| 灵活性 | 更底层，更灵活 | 更简单，更高层 |
| 类型安全 | 需要手动类型转换 | 类型自动推断 |
| 使用场景 | 复杂拦截、审计 | 简单审批 |
| 配置复杂度 | 较高 | 较低 |

**选择建议：**
- **简单审批** → 使用 `canUseTool`
- **复杂拦截** → 使用 `Hooks`
- **两者结合** → 获得最大灵活性

## 最佳实践

### 1. 类型安全

始终进行类型转换：

```typescript
// ✅ 好的做法
const preInput = input as PreToolUseHookInput;
const filePath = preInput.tool_input?.file_path as string;

// ❌ 避免
const filePath = input.tool_input.file_path;  // 类型错误
```

### 2. 错误处理

钩子中的错误会中断执行：

```typescript
const safeHook: HookCallback = async (input) => {
    try {
        // 钩子逻辑
        return {};
    } catch (error) {
        console.error('Hook error:', error);
        return {
            hookSpecificOutput: {
                hookEventName: input.hook_event_name,
                permissionDecision: 'deny',
                permissionDecisionReason: 'Hook execution failed'
            }
        };
    }
};
```

### 3. 性能考虑

钩子会影响性能，避免耗时操作：

```typescript
// ❌ 避免：同步等待
const slowHook: HookCallback = async (input) => {
    await heavyComputation();  // 耗时操作
    return {};
};

// ✅ 好的做法：异步记录
const fastHook: HookCallback = async (input) => {
    // 快速决策
    logAsync(input);  // 异步记录，不阻塞
    return {};
};
```

### 4. 明确的拒绝理由

提供清晰的拒绝原因：

```typescript
return {
    hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        permissionDecision: 'deny',
        permissionDecisionReason: '详细说明为什么拒绝，帮助调试'
    }
};
```

## 调试技巧

### 1. 打印钩子输入

```typescript
const debugHook: HookCallback = async (input, toolUseID) => {
    console.log('=== Hook Debug ===');
    console.log('Tool Use ID:', toolUseID);
    console.log('Input:', JSON.stringify(input, null, 2));
    return {};
};
```

### 2. 条件性拦截

仅在开发环境拦截：

```typescript
const devOnlyHook: HookCallback = async (input) => {
    if (process.env.NODE_ENV === 'development') {
        // 开发环境的拦截逻辑
        console.log('[Dev] Intercepted:', input);
    }
    return {};
};
```

## 完整示例：综合安全策略

```typescript
import { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { query } from "../lib/setup.js";

// 1. 文件保护钩子
const protectFiles: HookCallback = async (input) => {
    const preInput = input as PreToolUseHookInput;
    const filePath = preInput.tool_input?.file_path as string;

    if (filePath?.includes('.env') || filePath?.includes('secret')) {
        return {
            hookSpecificOutput: {
                hookEventName: input.hook_event_name,
                permissionDecision: 'deny',
                permissionDecisionReason: 'Protected file'
            }
        };
    }
    return {};
};

// 2. 命令白名单钩子
const whitelistBash: HookCallback = async (input) => {
    const preInput = input as PreToolUseHookInput;
    const command = preInput.tool_input?.command as string;

    const allowed = ['ls', 'cat', 'grep', 'find'];
    const cmd = command.trim().split(/\s+/)[0];

    if (!allowed.includes(cmd)) {
        return {
            hookSpecificOutput: {
                hookEventName: input.hook_event_name,
                permissionDecision: 'deny',
                permissionDecisionReason: `Command '${cmd}' not allowed`
            }
        };
    }
    return {};
};

// 3. 审计日志钩子
const auditLog: any[] = [];
const audit: HookCallback = async (input, toolUseID) => {
    const preInput = input as PreToolUseHookInput;
    auditLog.push({
        timestamp: new Date().toISOString(),
        toolUseID: toolUseID,
        tool: preInput.tool_name,
        input: preInput.tool_input
    });
    return {};
};

// 应用钩子
for await (const message of query({
    prompt: "Analyze the codebase and suggest improvements",
    options: {
        hooks: {
            PreToolUse: [
                { matcher: 'Write|Edit', hooks: [protectFiles] },
                { matcher: 'Bash', hooks: [whitelistBash] },
                { matcher: '.*', hooks: [audit] }
            ]
        }
    }
})) {
    if ("result" in message) {
        console.log(message.result);
    }
}

// 输出审计日志
console.log('\n=== Audit Log ===');
console.log(JSON.stringify(auditLog, null, 2));
```

## 常见问题

### Q: Hooks 和 canUseTool 可以同时使用吗？

**A:** 可以！执行顺序：
1. Hooks (PreToolUse)
2. canUseTool
3. 工具执行
4. Hooks (PostToolUse)

### Q: 如何在钩子中访问会话状态？

**A:** 使用闭包或外部变量：

```typescript
const state = { callCount: 0 };

const statefulHook: HookCallback = async (input) => {
    state.callCount++;
    console.log(`Call count: ${state.callCount}`);
    return {};
};
```

### Q: 钩子可以是异步的吗？

**A:** 可以，钩子函数是 async 的：

```typescript
const asyncHook: HookCallback = async (input) => {
    await externalValidation(input);  // 异步操作
    return {};
};
```

## 下一步

- [会话管理](./05-session-management.md) - 持久化对话上下文
- [文件检查点](./06-file-checkpointing.md) - 回滚文件修改

## 相关示例

- `examples/08-hooks-intercept-control-angent-with-hooks.ts` - 钩子拦截示例
