---
layout: default
title: 权限处理
nav_order: 4
parent: 基础入门
---

# 权限处理

## 概述

权限管理是 Agent 安全运行的关键。Claude Agent SDK 提供了灵活的权限控制机制，让你能够精确控制 Agent 可以执行哪些操作。

## 三种权限模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| `ask`（默认） | 每次工具调用都需要用户确认 | 开发测试、不确定的操作 |
| `acceptEdits` | 自动批准文件编辑，其他需确认 | 代码重构、自动化修改 |
| `acceptAll` | 自动批准所有工具调用 | 完全信任的自动化任务 |

## 权限模式对比

### ask 模式（默认）

最安全的模式，每个工具调用都需要确认：

```typescript
for await (const message of query({
    prompt: "Refactor the code",
    options: {
        permissionMode: "ask",  // 或 "default"
        allowedTools: ["Read", "Edit", "Bash"]
    }
})) {
    // Agent 会在执行每个工具前请求权限
}
```

**权限请求示例：**
```
Claude wants to use tool: Edit
File: utils.py
Approve? (y/n)
```

### acceptEdits 模式

自动批准文件编辑，适合代码修改任务：

```typescript
for await (const message of query({
    prompt: "Add type hints to all functions",
    options: {
        permissionMode: "acceptEdits",
        allowedTools: ["Read", "Edit", "Grep"]
    }
})) {
    // Edit 工具自动批准
    // Read、Grep 等其他工具仍需确认
}
```

### acceptAll 模式

完全自动化，适合可信任的环境：

```typescript
for await (const message of query({
    prompt: "Run tests and fix failures",
    options: {
        permissionMode: "acceptAll",
        allowedTools: ["Read", "Edit", "Bash"]
    }
})) {
    // 所有工具调用自动批准
}
```

## 示例 1：查询时设置权限

**文件：** `examples/05-permission-at-query-time.ts`

```typescript
import { query, getConfig } from "../lib/setup.js";

const cfg = getConfig();

async function main() {
    for await (const message of query({
        prompt: "Help me refactor this code, filename: utils.py",
        options: {
            permissionMode: "default",  // 在查询时设置模式
            pathToClaudeCodeExecutable: cfg.claudeExecutablePath
        },
    })) {
        if ("result" in message) {
            console.log(message.result);
        }
    }
}

main();
```

**代码解析：**

1. **`permissionMode: "default"`**：等同于 `"ask"` 模式
2. **`pathToClaudeCodeExecutable`**：指定 Claude Code CLI 路径（可选）
3. **适用场景**：需要严格控制每个操作的场景

## 示例 2：流式交互中动态调整权限

**文件：** `examples/06-permission-during-streaming.ts`

```typescript
import { query } from "../lib/setup.js";

async function main() {
    const q = query({
        prompt: "Help me format this code, filename: utils.py",
        options: {
            permissionMode: "default",  // 初始为 ask 模式
        },
    });

    // 在会话过程中动态改变权限模式
    await q.setPermissionMode("acceptEdits");

    // 使用新的权限模式处理消息
    for await (const message of q) {
        if ("result" in message) {
            console.log(message.result);
        }
    }
}

main();
```

**代码解析：**

1. **`q.setPermissionMode()`**：动态调整权限模式
2. **使用场景**：
   - 初始阶段需要审查，后续自动化
   - 根据 Agent 表现调整信任级别
   - 不同阶段需要不同权限控制

3. **时机选择**：
   ```typescript
   const q = query({...});

   // 在开始迭代前调整
   await q.setPermissionMode("acceptEdits");

   for await (const message of q) {
       // 处理消息
   }
   ```

## 权限与工具白名单

权限模式与 `allowedTools` 配合使用：

```typescript
options: {
    allowedTools: ["Read", "Edit", "Bash"],  // 限制可用工具
    permissionMode: "acceptEdits"            // 控制执行权限
}
```

### 权限决策流程

```
工具调用请求
    ↓
是否在 allowedTools 中？
    ↓ 是
检查 permissionMode
    ↓
ask: 请求用户确认
acceptEdits: Edit 自动批准，其他询问
acceptAll: 自动批准
    ↓
执行工具
```

## 安全建议

### 1. 生产环境使用 ask 模式

```typescript
// ✅ 生产环境推荐
options: {
    permissionMode: "ask",
    allowedTools: ["Read", "Grep"]  // 只读工具
}
```

### 2. 开发环境可使用 acceptEdits

```typescript
// ✅ 开发环境可接受
options: {
    permissionMode: "acceptEdits",
    allowedTools: ["Read", "Edit", "Grep"]
}
```

### 3. 谨慎使用 acceptAll

```typescript
// ⚠️ 仅在完全信任的场景使用
options: {
    permissionMode: "acceptAll",
    allowedTools: ["Read", "Edit", "Bash"]
}
```

### 4. 最小权限原则

只授予必要的工具权限：

```typescript
// ✅ 好的做法
allowedTools: ["Read", "Grep"]  // 只读任务

// ❌ 避免过度授权
allowedTools: ["*"]  // 所有工具
```

## 工具分类与风险等级

| 工具类别 | 工具 | 风险等级 | 建议权限模式 |
|---------|------|---------|-------------|
| 只读 | Read, Grep, Glob | 低 | ask/acceptAll |
| 文件修改 | Edit, Write | 中 | ask/acceptEdits |
| 命令执行 | Bash | 高 | ask |
| 网络访问 | WebSearch, WebFetch | 中 | ask |

## 实战场景

### 场景 1：代码审查（只读）

```typescript
options: {
    permissionMode: "acceptAll",  // 只读操作可以自动化
    allowedTools: ["Read", "Grep", "Glob"]
}
```

### 场景 2：代码重构（修改）

```typescript
options: {
    permissionMode: "acceptEdits",  // 自动批准编辑
    allowedTools: ["Read", "Edit", "Grep"]
}
```

### 场景 3：测试运行（执行）

```typescript
options: {
    permissionMode: "ask",  // 命令执行需要确认
    allowedTools: ["Read", "Edit", "Bash"]
}
```

## 权限控制的两个层次

本文介绍的 `permissionMode` 是**粗粒度**的权限控制，适合快速设置。如果需要**细粒度**控制（如针对特定文件、特定条件的审批），请参考[用户审批与输入](./03-user-approvals.md)中的 `canUseTool` 机制。

两者可以同时使用：
- `permissionMode`: 设置默认行为
- `canUseTool`: 实现特殊逻辑

## 常见问题

### Q: 如何在运行时动态切换权限模式？

**A:** 使用 `setPermissionMode()` 方法：

```typescript
const q = query({
    prompt: "执行任务",
    options: { permissionMode: "ask" }
});

// 在执行过程中切换
await q.setPermissionMode("acceptEdits");

for await (const message of q) {
    // 使用新的权限模式处理
}
```

### Q: acceptEdits 模式会批准哪些工具？

**A:** 只自动批准 `Edit` 和 `Write` 工具，其他工具（如 `Bash`）仍需确认。

### Q: 如何实现更细粒度的权限控制？

**A:** 使用 `canUseTool` 回调函数，详见[用户审批与输入](./03-user-approvals.md)。它允许你：
- 针对特定文件设置不同权限
- 根据工具参数动态决策
- 修改工具输入参数
- 实现复杂的审批逻辑

### Q: permissionMode 和 allowedTools 的优先级？

**A:** 两者配合使用：
1. `allowedTools` 先过滤：工具必须在白名单中
2. `permissionMode` 再决策：是否需要用户确认

## 下一步

- [用户审批与输入](./03-user-approvals.md) - 学习更精细的审批控制
- [钩子函数](./04-hooks.md) - 拦截和控制 Agent 行为

## 相关示例

- `examples/05-permission-at-query-time.ts` - 查询时权限设置
- `examples/06-permission-during-streaming.ts` - 动态调整权限
- `examples/02-write-modify-file.ts` - acceptEdits 模式应用
