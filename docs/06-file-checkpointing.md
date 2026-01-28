---
layout: default
title: 文件检查点
nav_order: 8
parent: 会话管理
---

# 文件检查点

## 概述

文件检查点（File Checkpointing）是 SDK 提供的时光机功能，允许你：
- 在 Agent 修改文件前自动创建快照
- 回滚到任意历史检查点
- 撤销不满意的修改
- 实现类似 Git 的版本控制

这在实验性修改、A/B 测试、错误恢复等场景中非常有用。

## 文件检查点 vs 会话管理

SDK 提供两种不同的状态管理机制，理解它们的区别很重要：

| 特性 | 会话（Session） | 文件检查点（File Checkpoint） |
|------|----------------|------------------------------|
| **管理对象** | 对话历史和上下文 | 文件系统状态 |
| **标识符** | `session_id` | `checkpoint UUID` |
| **主要用途** | 恢复对话、分叉会话 | 回滚文件修改 |
| **生命周期** | 持续整个会话 | 每个用户消息创建一个 |
| **恢复方式** | `resume: sessionId` | `rewindFiles(checkpointId)` |
| **相关文档** | [会话管理](./05-session-management.md) | 本文档 |

**使用场景：**
- **会话管理**：跨多天保持项目上下文、A/B 测试不同方案
- **文件检查点**：撤销文件修改、实验性代码更改、错误恢复

**组合使用：**
```typescript
// 1. 创建会话并启用文件检查点
const response = query({
    prompt: "Refactor the code",
    options: {
        enableFileCheckpointing: true,  // 启用文件检查点
        extraArgs: { 'replay-user-messages': null },
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    }
});

let sessionId: string;
let checkpointId: string;

for await (const message of response) {
    if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id;  // 保存会话 ID
    }
    if (message.type === 'user' && message.uuid) {
        checkpointId = message.uuid;  // 保存检查点 ID
    }
}

// 2. 稍后恢复会话并回滚文件
const rewindQuery = query({
    prompt: "",
    options: {
        resume: sessionId,  // 恢复会话（对话历史）
        enableFileCheckpointing: true,
        extraArgs: { 'replay-user-messages': null },
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    }
});

for await (const msg of rewindQuery) {
    await rewindQuery.rewindFiles(checkpointId);  // 回滚文件（文件系统）
    break;
}
```

## 检查点工作原理

```
┌──────────────────────────────────────────────────────────┐
│                  文件检查点生命周期                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  启用检查点                                               │
│  enableFileCheckpointing: true                           │
│  ↓                                                       │
│  Agent 修改文件                                           │
│  ↓                                                       │
│  自动创建检查点 (checkpoint UUID)                         │
│  ↓                                                       │
│  继续修改...                                              │
│  ↓                                                       │
│  创建更多检查点                                           │
│  ↓                                                       │
│  ┌────────────────────────────────┐                     │
│  │  回滚到任意检查点                │                     │
│  │  rewindFiles(checkpointUUID)   │                     │
│  └────────────────────────────────┘                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 检查点配置

启用检查点需要三个配置：

```typescript
const opts = {
    enableFileCheckpointing: true,  // 1. 启用检查点
    extraArgs: {
        'replay-user-messages': null  // 2. 接收检查点 UUID
    },
    env: {
        ...process.env,
        CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1'  // 3. 环境变量
    }
};
```

**配置说明：**
1. **enableFileCheckpointing**: 启用检查点功能
2. **replay-user-messages**: 让 SDK 在响应流中包含检查点 UUID
3. **环境变量**: Claude Code 内部标志，必须设置

## 示例 1：单检查点回滚

**文件：** `examples/11-rewind-single-checkpoint.ts`

```typescript
import { query } from '../lib/setup.js';

async function main() {
    // 第一步：启用检查点
    const opts = {
        enableFileCheckpointing: true,
        permissionMode: "acceptEdits" as const,  // 自动批准文件编辑
        extraArgs: { 'replay-user-messages': null },
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    };

    const response = query({
        prompt: "Format the utils.py file according to PEP 8 standards, fixing any style issues.",
        options: opts
    });

    let checkpointId: string | undefined;
    let sessionId: string | undefined;

    // 第二步：捕获检查点 UUID
    for await (const message of response) {
        // 检查点 UUID 在用户消息的 uuid 字段中
        if (message.type === 'user' && message.uuid && !checkpointId) {
            checkpointId = message.uuid;
        }
        if ('session_id' in message && !sessionId) {
            sessionId = message.session_id;
        }
    }

    // 第三步：回滚到检查点
    if (checkpointId && sessionId) {
        const rewindQuery = query({
            prompt: "",  // 空提示符以打开连接
            options: { ...opts, resume: sessionId }
        });

        for await (const msg of rewindQuery) {
            // 第四步：执行回滚
            await rewindQuery.rewindFiles(checkpointId);
            break;
        }
        console.log(`Rewound to checkpoint: ${checkpointId}`);
    }
}

main();
```

**代码解析：**

1. **检查点 UUID 的位置**：
   ```typescript
   if (message.type === 'user' && message.uuid) {
       checkpointId = message.uuid;  // 这是检查点 ID
   }
   ```
   每条用户消息都有一个 `uuid`，这就是检查点标识符。

2. **回滚流程**：
   ```typescript
   // 1. 恢复会话
   const rewindQuery = query({
       prompt: "",
       options: { ...opts, resume: sessionId }
   });

   // 2. 执行回滚
   for await (const msg of rewindQuery) {
       await rewindQuery.rewindFiles(checkpointId);
       break;
   }
   ```

3. **空提示符的作用**：
   - `prompt: ""` 打开与 Agent 的连接
   - 但不发送新的任务
   - 只是为了调用 `rewindFiles()` 方法

## 示例 2：多检查点管理

**文件：** `examples/12-rewind-multiple-checkpoints.ts`

```typescript
import { query } from '../lib/setup.js';

// 检查点元数据结构
interface Checkpoint {
    id: string;
    description: string;
    timestamp: Date;
}

async function main() {
    const opts = {
        enableFileCheckpointing: true,
        permissionMode: "acceptEdits" as const,
        extraArgs: { 'replay-user-messages': null },
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    };

    const response = query({
        prompt: "Refactor the utils.py file to improve code quality and organization.",
        options: opts
    });

    const checkpoints: Checkpoint[] = [];
    let sessionId: string | undefined;

    // 收集所有检查点
    for await (const message of response) {
        if (message.type === 'user' && message.uuid) {
            checkpoints.push({
                id: message.uuid,
                description: `After turn ${checkpoints.length + 1}`,
                timestamp: new Date()
            });
        }
        if ('session_id' in message && !sessionId) {
            sessionId = message.session_id;
        }
    }

    // 回滚到任意检查点
    if (checkpoints.length > 0 && sessionId) {
        const target = checkpoints[0];  // 选择任意检查点
        const rewindQuery = query({
            prompt: "",
            options: { ...opts, resume: sessionId }
        });

        for await (const msg of rewindQuery) {
            await rewindQuery.rewindFiles(target.id);
            break;
        }

        // 显示可用检查点
        console.log(`Available checkpoints:`);
        checkpoints.forEach((cp, index) => {
            console.log(`  ${index + 1}. ${cp.description} (ID: ${cp.id}, Time: ${cp.timestamp.toISOString()})`);
        });
        console.log(`Rewound to: ${target.description}`);
    }
}

main();
```

**代码解析：**

1. **检查点收集**：
   ```typescript
   const checkpoints: Checkpoint[] = [];

   for await (const message of response) {
       if (message.type === 'user' && message.uuid) {
           checkpoints.push({
               id: message.uuid,
               description: `After turn ${checkpoints.length + 1}`,
               timestamp: new Date()
           });
       }
   }
   ```
   每轮对话都会产生一个检查点。

2. **选择性回滚**：
   ```typescript
   const target = checkpoints[0];  // 回滚到第一个检查点
   // 或
   const target = checkpoints[checkpoints.length - 1];  // 最后一个
   // 或
   const target = checkpoints.find(cp => cp.description.includes('某特征'));
   ```

## 检查点管理器

构建完整的检查点管理系统：

```typescript
class CheckpointManager {
    private checkpoints: Map<string, Checkpoint> = new Map();

    // 添加检查点
    addCheckpoint(id: string, description: string) {
        this.checkpoints.set(id, {
            id: id,
            description: description,
            timestamp: new Date()
        });
    }

    // 列出所有检查点
    listCheckpoints(): Checkpoint[] {
        return Array.from(this.checkpoints.values())
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }

    // 查找检查点
    findCheckpoint(description: string): Checkpoint | undefined {
        return Array.from(this.checkpoints.values())
            .find(cp => cp.description.includes(description));
    }

    // 获取最近的检查点
    getLatest(): Checkpoint | undefined {
        const sorted = this.listCheckpoints();
        return sorted[sorted.length - 1];
    }

    // 获取最早的检查点
    getEarliest(): Checkpoint | undefined {
        const sorted = this.listCheckpoints();
        return sorted[0];
    }
}

// 使用
const manager = new CheckpointManager();

for await (const message of response) {
    if (message.type === 'user' && message.uuid) {
        manager.addCheckpoint(
            message.uuid,
            `Checkpoint at ${new Date().toISOString()}`
        );
    }
}

// 回滚到最早的状态
const earliest = manager.getEarliest();
if (earliest) {
    await rewindQuery.rewindFiles(earliest.id);
}
```

## 实战场景

### 场景 1：实验性修改

尝试不同的重构方案：

```typescript
async function experimentWithRefactoring() {
    const opts = {
        enableFileCheckpointing: true,
        permissionMode: "acceptEdits" as const,
        extraArgs: { 'replay-user-messages': null },
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    };

    // 保存初始状态
    let initialCheckpoint: string | undefined;
    let sessionId: string | undefined;

    // 尝试方案 A
    const responseA = query({
        prompt: "Refactor using functional programming style",
        options: opts
    });

    for await (const message of responseA) {
        if (message.type === 'user' && message.uuid && !initialCheckpoint) {
            initialCheckpoint = message.uuid;
        }
        if ('session_id' in message) {
            sessionId = message.session_id;
        }
    }

    // 评估结果...
    console.log("Evaluating approach A...");

    // 回滚到初始状态
    if (initialCheckpoint && sessionId) {
        const rewind = query({
            prompt: "",
            options: { ...opts, resume: sessionId }
        });

        for await (const msg of rewind) {
            await rewind.rewindFiles(initialCheckpoint);
            break;
        }
    }

    // 尝试方案 B
    const responseB = query({
        prompt: "Refactor using object-oriented style",
        options: { ...opts, resume: sessionId }
    });

    for await (const message of responseB) {
        // 处理方案 B...
    }

    console.log("Evaluating approach B...");
}
```

### 场景 2：自动回滚失败修改

检测错误并自动回滚：

```typescript
async function autoRevertOnError() {
    const opts = {
        enableFileCheckpointing: true,
        permissionMode: "acceptEdits" as const,
        extraArgs: { 'replay-user-messages': null },
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    };

    const response = query({
        prompt: "Optimize the algorithm in compute.py",
        options: opts
    });

    let lastGoodCheckpoint: string | undefined;
    let sessionId: string | undefined;

    for await (const message of response) {
        if (message.type === 'user' && message.uuid) {
            // 测试修改是否正确
            const testPassed = await runTests();

            if (testPassed) {
                lastGoodCheckpoint = message.uuid;
                console.log("✅ Tests passed, checkpoint saved");
            } else {
                console.log("❌ Tests failed, reverting...");

                // 回滚到上一个好的检查点
                if (lastGoodCheckpoint && sessionId) {
                    const rewind = query({
                        prompt: "",
                        options: { ...opts, resume: sessionId }
                    });

                    for await (const msg of rewind) {
                        await rewind.rewindFiles(lastGoodCheckpoint);
                        break;
                    }
                }
                break;
            }
        }

        if ('session_id' in message) {
            sessionId = message.session_id;
        }
    }
}

async function runTests(): Promise<boolean> {
    // 运行测试套件
    // 返回是否通过
    return true;
}
```

### 场景 3：交互式检查点选择

让用户选择回滚目标：

```typescript
import * as readline from 'readline';

async function interactiveRewind() {
    const opts = {
        enableFileCheckpointing: true,
        permissionMode: "acceptEdits" as const,
        extraArgs: { 'replay-user-messages': null },
        env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
    };

    const response = query({
        prompt: "Refactor the entire project structure",
        options: opts
    });

    const checkpoints: Checkpoint[] = [];
    let sessionId: string | undefined;

    for await (const message of response) {
        if (message.type === 'user' && message.uuid) {
            checkpoints.push({
                id: message.uuid,
                description: `Checkpoint ${checkpoints.length + 1}`,
                timestamp: new Date()
            });
        }
        if ('session_id' in message) {
            sessionId = message.session_id;
        }
    }

    // 显示检查点列表
    console.log("\nAvailable checkpoints:");
    checkpoints.forEach((cp, index) => {
        console.log(`  ${index + 1}. ${cp.description} - ${cp.timestamp.toLocaleString()}`);
    });

    // 获取用户选择
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const choice = await new Promise<string>(resolve => {
        rl.question("\nSelect checkpoint to rewind to (number): ", answer => {
            rl.close();
            resolve(answer);
        });
    });

    const index = parseInt(choice) - 1;
    if (index >= 0 && index < checkpoints.length && sessionId) {
        const target = checkpoints[index];
        const rewind = query({
            prompt: "",
            options: { ...opts, resume: sessionId }
        });

        for await (const msg of rewind) {
            await rewind.rewindFiles(target.id);
            break;
        }

        console.log(`✅ Rewound to: ${target.description}`);
    } else {
        console.log("❌ Invalid selection");
    }
}
```

## 检查点持久化

保存检查点信息到文件：

```typescript
import fs from 'fs';

class PersistentCheckpointManager {
    private checkpointsFile = './checkpoints.json';

    // 保存检查点
    saveCheckpoints(checkpoints: Checkpoint[], sessionId: string) {
        const data = {
            sessionId: sessionId,
            checkpoints: checkpoints,
            savedAt: new Date().toISOString()
        };
        fs.writeFileSync(this.checkpointsFile, JSON.stringify(data, null, 2));
    }

    // 加载检查点
    loadCheckpoints(): { sessionId: string; checkpoints: Checkpoint[] } | null {
        try {
            const data = fs.readFileSync(this.checkpointsFile, 'utf-8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    // 清理旧检查点
    cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000) {
        const data = this.loadCheckpoints();
        if (!data) return;

        const now = Date.now();
        data.checkpoints = data.checkpoints.filter(cp => {
            const age = now - new Date(cp.timestamp).getTime();
            return age < maxAge;
        });

        this.saveCheckpoints(data.checkpoints, data.sessionId);
    }
}

// 使用
const manager = new PersistentCheckpointManager();

// 保存
manager.saveCheckpoints(checkpoints, sessionId!);

// 加载
const saved = manager.loadCheckpoints();
if (saved) {
    console.log(`Loaded ${saved.checkpoints.length} checkpoints`);
}

// 清理超过 7 天的检查点
manager.cleanup();
```

## 检查点与 Git 对比

| 特性 | 文件检查点 | Git |
|------|-----------|-----|
| 自动创建 | ✅ 每次修改自动 | ❌ 需手动 commit |
| 粒度 | 细粒度（每轮对话） | 粗粒度（手动提交） |
| 持久性 | 会话级别 | 永久 |
| 回滚速度 | 极快 | 较快 |
| 适用场景 | 实验、快速迭代 | 长期版本控制 |

**建议：**
- 短期实验 → 使用文件检查点
- 长期版本控制 → 使用 Git
- 两者结合 → 获得最佳效果

## 最佳实践

### 1. 总是启用检查点

在允许文件修改的场景中：

```typescript
// ✅ 好的做法
const opts = {
    enableFileCheckpointing: true,
    permissionMode: "acceptEdits" as const,
    extraArgs: { 'replay-user-messages': null },
    env: { ...process.env, CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
};
```

### 2. 记录检查点元数据

添加有意义的描述：

```typescript
checkpoints.push({
    id: message.uuid,
    description: `Refactored ${fileName} - ${operation}`,  // 详细描述
    timestamp: new Date()
});
```

### 3. 定期清理

避免检查点过多：

```typescript
// 只保留最近 N 个检查点
const MAX_CHECKPOINTS = 10;
if (checkpoints.length > MAX_CHECKPOINTS) {
    checkpoints = checkpoints.slice(-MAX_CHECKPOINTS);
}
```

### 4. 错误处理

回滚可能失败，需要处理：

```typescript
try {
    await rewindQuery.rewindFiles(checkpointId);
    console.log("✅ Rewind successful");
} catch (error) {
    console.error("❌ Rewind failed:", error);
    // 回退到备用方案
}
```

## 常见问题

### Q: 检查点会占用多少存储空间?

**A:** 检查点是增量存储，只保存文件差异，占用空间很小。但会话结束后会被清理。

### Q: 可以回滚到任意检查点吗?

**A:** 可以，但只能在同一会话内。检查点与 session_id 绑定。

### Q: 回滚会影响对话历史吗?

**A:** 不会。回滚只影响文件状态，对话历史保持不变。

### Q: 检查点和会话分叉有什么区别?

**A:**
- **检查点**: 回滚文件状态
- **会话分叉**: 创建新的对话分支

可以结合使用：先分叉会话，再在分叉中回滚文件。

## 下一步

- [结构化输出](./07-structured-outputs.md) - 获取结构化数据
- [系统提示词](./08-system-prompts.md) - 自定义 Agent 行为

## 相关示例

- `examples/11-rewind-single-checkpoint.ts` - 单检查点回滚
- `examples/12-rewind-multiple-checkpoints.ts` - 多检查点管理
