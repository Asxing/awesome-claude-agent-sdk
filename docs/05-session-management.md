---
layout: default
title: 05. 会话管理
nav_order: 7
---

# 会话管理

## 概述

会话（Session）是 Claude Agent SDK 的核心概念，它保存了完整的对话历史和上下文。通过会话管理，你可以：
- 保存对话进度，稍后恢复
- 分叉会话，尝试不同方案
- 实现多轮对话的持久化
- 构建有状态的 Agent 应用

## 会话生命周期

```
┌──────────────────────────────────────────────────────────┐
│                     会话生命周期                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  创建会话                                                 │
│  ↓                                                       │
│  query({ prompt: "..." })                                │
│  ↓                                                       │
│  获取 session_id (来自 init 消息)                         │
│  ↓                                                       │
│  ┌─────────────────┬──────────────────┐                 │
│  │                 │                  │                 │
│  │  继续会话        │   分叉会话        │                 │
│  │  resume: id     │   forkSession    │                 │
│  │  (保持上下文)    │   (创建副本)      │                 │
│  │                 │                  │                 │
│  └─────────────────┴──────────────────┘                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 会话 ID 的作用

每个会话都有唯一的 `session_id`，它：
- 标识一个完整的对话历史
- 可用于恢复之前的对话
- 包含所有工具调用和文件修改历史
- 支持分叉创建独立副本

## 示例 1：获取和恢复会话

**文件：** `examples/09-session-getting-session-id.ts`

```typescript
import { query } from '../lib/setup.js';

let sessionId: string | undefined;

// 创建新会话
const response = query({
    prompt: "Help me build a web application",
    options: {
        model: "claude-sonnet-4-5"
    }
});

for await (const message of response) {
    // 第一条消息是系统初始化消息，包含 session_id
    if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id;
        console.log(`Session started with ID: ${sessionId}`);

        // 可以保存这个 ID 供后续使用
    }

    // 处理其他消息...
    console.log(message);
}

// 稍后，使用保存的 sessionId 恢复会话
if (sessionId) {
    for await (const resumedResponse of query({
        prompt: "Continue where we left off",
        options: {
            resume: sessionId  // 恢复之前的会话
        }
    })) {
        console.log(`Resume Session ID: ${sessionId}`);
        if ("result" in resumedResponse) {
            console.log(resumedResponse.result);
        }
    }
}
```

**代码解析：**

1. **init 消息**：
   ```typescript
   {
       type: 'system',
       subtype: 'init',
       session_id: 'abc-123-def',
       ...
   }
   ```
   这是每个会话的第一条消息，包含 `session_id`。

2. **提取 session_id**：
   ```typescript
   if (message.type === 'system' && message.subtype === 'init') {
       sessionId = message.session_id;
   }
   ```

3. **恢复会话**：
   ```typescript
   options: {
       resume: sessionId  // 使用之前保存的 ID
   }
   ```
   恢复后，Agent 能访问完整的历史对话。

## 示例 2：会话分叉

**文件：** `examples/10-session-forking-a-session.ts`

```typescript
import { query } from "../lib/setup.js";

// 第一步：创建原始会话
let sessionId: string | undefined;

const response = query({
    prompt: "Help me design a REST API",
    options: { model: "claude-sonnet-4-5" }
});

for await (const message of response) {
    if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id;
        console.log(`Original session: ${sessionId}`);
    }
}

// 第二步：分叉会话尝试不同方案
const forkedResponse = query({
    prompt: "Now let's redesign this as a GraphQL API instead",
    options: {
        resume: sessionId,
        forkSession: true,  // 创建新的 session_id
        model: "claude-sonnet-4-5"
    }
});

for await (const message of forkedResponse) {
    if (message.type === 'system' && message.subtype === 'init') {
        console.log(`Forked session: ${message.session_id}`);
        // 这将是一个不同的 session ID
    }
}

// 第三步：原始会话保持不变，可以继续
const originalContinued = query({
    prompt: "Add authentication to the REST API",
    options: {
        resume: sessionId,
        forkSession: false,  // 继续原始会话（默认）
        model: "claude-sonnet-4-5"
    }
});

for await (const message of originalContinued) {
    if (message.type === 'system' && message.subtype === 'init') {
        console.log(`Original session continued: ${message.session_id}`);
        // 这将是与原始相同的 session ID
    }
}
```

**代码解析：**

1. **会话分叉流程**：
   ```
   原始会话 (session-A)
       ↓
   ┌──────────────┬──────────────┐
   │              │              │
   分叉会话        继续原会话
   (session-B)    (session-A)
   ```

2. **分叉选项**：
   ```typescript
   options: {
       resume: originalSessionId,  // 基于哪个会话
       forkSession: true           // 是否创建新 ID
   }
   ```

3. **使用场景**：
   - **分叉**：尝试不同的实现方案，保留原方案
   - **继续**：在原有基础上继续开发

## 会话管理最佳实践

### 1. 持久化 Session ID

将 session_id 保存到文件或数据库：

```typescript
import fs from 'fs';

let sessionId: string | undefined;

// 保存会话
function saveSession(id: string) {
    fs.writeFileSync('./session.json', JSON.stringify({ sessionId: id }));
}

// 加载会话
function loadSession(): string | undefined {
    try {
        const data = fs.readFileSync('./session.json', 'utf-8');
        return JSON.parse(data).sessionId;
    } catch {
        return undefined;
    }
}

// 使用
const response = query({
    prompt: "Start new task",
    options: {
        resume: loadSession()  // 自动恢复上次会话
    }
});

for await (const message of response) {
    if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id;
        saveSession(sessionId);  // 保存新会话
    }
}
```

### 2. 会话超时管理

实现会话过期逻辑：

```typescript
interface SessionInfo {
    id: string;
    timestamp: number;
}

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;  // 24小时

function isSessionValid(session: SessionInfo): boolean {
    return Date.now() - session.timestamp < SESSION_TIMEOUT;
}

function saveSessionWithTimestamp(id: string) {
    const session: SessionInfo = {
        id: id,
        timestamp: Date.now()
    };
    fs.writeFileSync('./session.json', JSON.stringify(session));
}

function loadValidSession(): string | undefined {
    try {
        const data = fs.readFileSync('./session.json', 'utf-8');
        const session: SessionInfo = JSON.parse(data);
        return isSessionValid(session) ? session.id : undefined;
    } catch {
        return undefined;
    }
}
```

### 3. 多会话管理

管理多个并发会话：

```typescript
class SessionManager {
    private sessions: Map<string, string> = new Map();

    startSession(name: string, sessionId: string) {
        this.sessions.set(name, sessionId);
    }

    getSession(name: string): string | undefined {
        return this.sessions.get(name);
    }

    listSessions(): string[] {
        return Array.from(this.sessions.keys());
    }

    deleteSession(name: string) {
        this.sessions.delete(name);
    }
}

// 使用
const manager = new SessionManager();

// 创建多个会话
for await (const message of query({ prompt: "Task A" })) {
    if (message.type === 'system' && message.subtype === 'init') {
        manager.startSession('taskA', message.session_id);
    }
}

for await (const message of query({ prompt: "Task B" })) {
    if (message.type === 'system' && message.subtype === 'init') {
        manager.startSession('taskB', message.session_id);
    }
}

// 恢复特定会话
const taskASession = manager.getSession('taskA');
if (taskASession) {
    for await (const message of query({
        prompt: "Continue Task A",
        options: { resume: taskASession }
    })) {
        // ...
    }
}
```

## 实战场景

### 场景 1：长期项目跟踪

跨多天保持项目上下文：

```typescript
const PROJECT_SESSION_FILE = './project-session.json';

async function continueProject(newTask: string) {
    // 加载项目会话
    const sessionId = loadSession();

    for await (const message of query({
        prompt: newTask,
        options: {
            resume: sessionId,  // 恢复项目上下文
            model: "claude-sonnet-4-5"
        }
    })) {
        if (message.type === 'system' && message.subtype === 'init') {
            // 更新会话 ID
            saveSession(message.session_id);
        }

        if ("result" in message) {
            console.log(message.result);
        }
    }
}

// 使用
await continueProject("Add user authentication");
// 第二天
await continueProject("Implement payment integration");
// 第三天
await continueProject("Add admin dashboard");
```

### 场景 2：A/B 方案测试

分叉会话测试不同实现：

```typescript
async function testApproaches(originalSessionId: string) {
    // 方案 A：使用 React
    const approachA = query({
        prompt: "Implement the UI using React",
        options: {
            resume: originalSessionId,
            forkSession: true
        }
    });

    // 方案 B：使用 Vue
    const approachB = query({
        prompt: "Implement the UI using Vue",
        options: {
            resume: originalSessionId,
            forkSession: true
        }
    });

    // 并行测试两种方案
    const [resultA, resultB] = await Promise.all([
        collectResults(approachA),
        collectResults(approachB)
    ]);

    console.log('Approach A:', resultA);
    console.log('Approach B:', resultB);
}

async function collectResults(query: AsyncIterable<any>): Promise<string[]> {
    const results: string[] = [];
    for await (const message of query) {
        if ("result" in message) {
            results.push(message.result);
        }
    }
    return results;
}
```

### 场景 3：会话快照

在关键点创建会话快照：

```typescript
interface SessionSnapshot {
    id: string;
    name: string;
    timestamp: number;
    description: string;
}

class SessionSnapshotManager {
    private snapshots: SessionSnapshot[] = [];

    createSnapshot(sessionId: string, name: string, description: string) {
        this.snapshots.push({
            id: sessionId,
            name: name,
            timestamp: Date.now(),
            description: description
        });
    }

    listSnapshots(): SessionSnapshot[] {
        return this.snapshots;
    }

    getSnapshot(name: string): string | undefined {
        return this.snapshots.find(s => s.name === name)?.id;
    }
}

// 使用
const snapshotManager = new SessionSnapshotManager();

// 在关键点创建快照
for await (const message of query({ prompt: "Design database schema" })) {
    if (message.type === 'system' && message.subtype === 'init') {
        snapshotManager.createSnapshot(
            message.session_id,
            'database-design-complete',
            'Initial database schema designed'
        );
    }
}

// 稍后从快照恢复
const snapshotId = snapshotManager.getSnapshot('database-design-complete');
if (snapshotId) {
    for await (const message of query({
        prompt: "Add new tables for analytics",
        options: { resume: snapshotId, forkSession: true }
    })) {
        // 基于快照继续开发
    }
}
```

## 会话状态检查

检查会话是否仍然有效：

```typescript
async function checkSessionStatus(sessionId: string): Promise<boolean> {
    try {
        const response = query({
            prompt: "ping",  // 简单测试
            options: {
                resume: sessionId
            }
        });

        for await (const message of response) {
            if (message.type === 'system' && message.subtype === 'init') {
                return message.session_id === sessionId;
            }
        }
        return false;
    } catch (error) {
        console.error('Session invalid:', error);
        return false;
    }
}

// 使用
const isValid = await checkSessionStatus(savedSessionId);
if (!isValid) {
    console.log('Session expired, starting new session');
}
```

## 会话元数据管理

扩展会话信息：

```typescript
interface ExtendedSessionInfo {
    id: string;
    name: string;
    created: number;
    lastAccessed: number;
    messageCount: number;
    tags: string[];
}

class ExtendedSessionManager {
    private sessions: Map<string, ExtendedSessionInfo> = new Map();

    createSession(id: string, name: string, tags: string[]) {
        this.sessions.set(id, {
            id: id,
            name: name,
            created: Date.now(),
            lastAccessed: Date.now(),
            messageCount: 0,
            tags: tags
        });
    }

    updateAccess(id: string) {
        const session = this.sessions.get(id);
        if (session) {
            session.lastAccessed = Date.now();
            session.messageCount++;
        }
    }

    findByTag(tag: string): ExtendedSessionInfo[] {
        return Array.from(this.sessions.values())
            .filter(s => s.tags.includes(tag));
    }

    getRecentSessions(limit: number = 5): ExtendedSessionInfo[] {
        return Array.from(this.sessions.values())
            .sort((a, b) => b.lastAccessed - a.lastAccessed)
            .slice(0, limit);
    }
}

// 使用
const manager = new ExtendedSessionManager();

for await (const message of query({ prompt: "Build API" })) {
    if (message.type === 'system' && message.subtype === 'init') {
        manager.createSession(
            message.session_id,
            'API Development',
            ['backend', 'api', 'nodejs']
        );
    }
}

// 查找所有后端相关会话
const backendSessions = manager.findByTag('backend');
console.log('Backend sessions:', backendSessions);

// 获取最近的会话
const recentSessions = manager.getRecentSessions(3);
console.log('Recent sessions:', recentSessions);
```

## 会话清理策略

自动清理过期会话：

```typescript
class SessionCleaner {
    private maxAge: number = 7 * 24 * 60 * 60 * 1000;  // 7天
    private maxSessions: number = 100;

    async cleanupOldSessions(sessions: Map<string, ExtendedSessionInfo>) {
        const now = Date.now();
        const toDelete: string[] = [];

        // 删除过期会话
        for (const [id, info] of sessions.entries()) {
            if (now - info.lastAccessed > this.maxAge) {
                toDelete.push(id);
            }
        }

        // 如果超过最大数量，删除最旧的
        if (sessions.size - toDelete.length > this.maxSessions) {
            const sorted = Array.from(sessions.values())
                .filter(s => !toDelete.includes(s.id))
                .sort((a, b) => a.lastAccessed - b.lastAccessed);

            const excess = sessions.size - toDelete.length - this.maxSessions;
            sorted.slice(0, excess).forEach(s => toDelete.push(s.id));
        }

        // 执行删除
        toDelete.forEach(id => sessions.delete(id));

        console.log(`Cleaned up ${toDelete.length} sessions`);
        return toDelete;
    }
}
```

## 常见问题

### Q: 会话会永久保存吗?

**A:** 不会。会话有生命周期限制（通常几天到几周），过期后无法恢复。建议：
- 定期导出重要会话内容
- 使用文件检查点保存关键状态
- 实现自己的持久化逻辑

### Q: 分叉会话会复制文件修改吗?

**A:** 是的。分叉会话会继承原会话的所有状态，包括：
- 对话历史
- 文件修改记录
- 工具调用历史

### Q: 可以在不同机器间共享会话吗?

**A:** session_id 是服务端标识，理论上可以跨机器使用，但需要：
- 相同的 API 密钥
- 网络可达性
- 会话未过期

### Q: resume 和 continue 有什么区别?

**A:**
- **resume**: 使用 `session_id` 恢复之前的会话
- **continue**: 在当前会话中继续对话（不需要 session_id）

## 下一步

- [文件检查点](./06-file-checkpointing.md) - 回滚文件修改
- [结构化输出](./07-structured-outputs.md) - 获取结构化数据

## 相关示例

- `examples/09-session-getting-session-id.ts` - 获取和恢复会话
- `examples/10-session-forking-a-session.ts` - 会话分叉
