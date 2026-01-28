---
layout: default
title: 11. 子代理
nav_order: 13
---

# 子代理

## 概述

子代理（Subagents）是 SDK 提供的强大功能，允许主 Agent 委派任务给专门的子 Agent。每个子代理可以有：
- 专门的系统提示词和专业领域
- 独立的工具集
- 不同的模型配置
- 独立的上下文和状态

## 子代理架构

```
┌──────────────────────────────────────────────────────────┐
│                    子代理架构                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  主 Agent                                                 │
│       ↓ (识别需要专业能力)                                 │
│  Task 工具调用                                            │
│       ↓                                                  │
│  ┌─────────────┬─────────────┬─────────────┐            │
│  │             │             │             │            │
│  │ code-       │ test-       │ security-   │            │
│  │ reviewer    │ runner      │ auditor     │            │
│  │             │             │             │            │
│  │ 专业提示词   │ 专业提示词   │ 专业提示词   │            │
│  │ 特定工具     │ 特定工具     │ 特定工具     │            │
│  │ 独立模型     │ 独立模型     │ 独立模型     │            │
│  │             │             │             │            │
│  └─────────────┴─────────────┴─────────────┘            │
│       ↓              ↓              ↓                    │
│  返回结果        返回结果      返回结果                   │
│       ↓                                                  │
│  主 Agent 整合                                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 子代理定义

### AgentDefinition 结构

```typescript
interface AgentDefinition {
    description: string;    // 描述（主 Agent 用来决定何时调用）
    prompt: string;         // 子代理的系统提示词
    tools: string[];        // 允许的工具列表
    model?: string;         // 使用的模型（可选）
}
```

### 配置子代理

```typescript
options: {
    allowedTools: ['Read', 'Grep', 'Task'],  // 必须包含 Task
    agents: {
        'agent-name': {
            description: '...',
            prompt: '...',
            tools: [...],
            model: 'sonnet'
        }
    }
}
```

## 示例 1：编程式定义子代理

**文件：** `examples/26-subagent-programmatic-definition.ts`

创建专门的代码审查和测试运行子代理：

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Review the utils.py for security issues",
    options: {
        // Task 工具是子代理调用的必需工具
        allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
        agents: {
            'code-reviewer': {
                // description 告诉主 Agent 何时使用此子代理
                description: 'Expert code review specialist. Use for quality, security, and maintainability reviews.',

                // prompt 定义子代理的行为和专业知识
                prompt: `You are a code review specialist with expertise in security, performance, and best practices.

When reviewing code:
- Identify security vulnerabilities
- Check for performance issues
- Verify adherence to coding standards
- Suggest specific improvements

Be thorough but concise in your feedback.`,

                // tools 限制子代理可以使用的工具（这里是只读）
                tools: ['Read', 'Grep', 'Glob'],

                // model 覆盖此子代理的默认模型
                model: 'sonnet'
            },

            'test-runner': {
                description: 'Runs and analyzes test suites. Use for test execution and coverage analysis.',

                prompt: `You are a test execution specialist. Run tests and provide clear analysis of results.

Focus on:
- Running test commands
- Analyzing test output
- Identifying failing tests
- Suggesting fixes for failures`,

                // Bash 访问让此子代理可以运行测试命令
                tools: ['Bash', 'Read', 'Grep'],
            }
        }
    }
})) {
    if ('result' in message) console.log(message.result);
}
```

**代码解析：**

1. **子代理触发**：
   - 主 Agent 分析用户查询
   - 识别需要"代码审查"专业能力
   - 自动调用 `code-reviewer` 子代理

2. **工具限制**：
   ```typescript
   tools: ['Read', 'Grep', 'Glob']  // 只读工具
   ```
   子代理只能读取代码，不能修改。

3. **专业化提示词**：
   ```typescript
   prompt: `You are a code review specialist...`
   ```
   定义子代理的角色和工作方式。

4. **Task 工具**：
   ```typescript
   allowedTools: ['Read', 'Grep', 'Glob', 'Task']
   ```
   主 Agent 必须有 `Task` 工具才能调用子代理。

## 示例 2：动态子代理配置

**文件：** `examples/27-subagent-dynamic-agent-configuration.ts`

根据运行时条件动态创建子代理：

```typescript
import { type AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { query } from '../lib/setup.js';

// 工厂函数返回 AgentDefinition
// 这种模式允许根据运行时条件自定义子代理
function createSecurityAgent(securityLevel: 'basic' | 'strict'): AgentDefinition {
    const isStrict = securityLevel === 'strict';

    return {
        description: 'Security code reviewer',

        // 根据严格程度自定义提示词
        prompt: `You are a ${isStrict ? 'strict' : 'balanced'} security reviewer...`,

        tools: ['Read', 'Grep', 'Glob'],

        // 关键洞察：高风险审查使用更强大的模型
        model: isStrict ? 'opus' : 'sonnet'
    };
}

// 子代理在查询时创建，因此每个请求可以使用不同的设置
for await (const message of query({
    prompt: "Review this utils.py for security issues",
    options: {
        allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
        agents: {
            // 使用所需配置调用工厂函数
            'security-reviewer': createSecurityAgent('strict')
        }
    }
})) {
    if ('result' in message) console.log(message.result);
}
```

**代码解析：**

1. **工厂模式**：
   ```typescript
   function createSecurityAgent(level): AgentDefinition {
       return {
           description: '...',
           prompt: `...${level}...`,
           model: level === 'strict' ? 'opus' : 'sonnet'
       };
   }
   ```

2. **动态配置**：
   - 根据安全级别调整提示词
   - 严格模式使用 Opus（更强大）
   - 普通模式使用 Sonnet（更快）

3. **使用场景**：
   - 根据文件类型选择不同配置
   - 根据用户权限调整能力
   - 根据任务复杂度选择模型

## 示例 3：检测子代理调用

**文件：** `examples/28-subagent-detect-subagent-invocation.ts`

监控子代理的调用和执行：

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Use the code-reviewer agent to review utils.py for potential improvements.",
    options: {
        allowedTools: ["Read", "Glob", "Grep", "Task"],
        agents: {
            "code-reviewer": {
                description: "Expert code reviewer.",
                prompt: "Analyze code quality and suggest improvements.",
                tools: ["Read", "Glob", "Grep"]
            }
        }
    }
})) {
    const msg = message as any;

    // 检查消息内容中的子代理调用
    for (const block of msg.message?.content ?? []) {
        if (block.type === "tool_use" && block.name === "Task") {
            console.log(`Subagent invoked: ${block.input.subagent_type}`);
        }
    }

    // 检查此消息是否来自子代理上下文
    if (msg.parent_tool_use_id) {
        console.log("Message from subagent:");
        console.log(message.message.content);
        console.log("  (running inside subagent)");
    }

    if ("result" in message) {
        console.log(message.result);
    }
}
```

**代码解析：**

1. **检测 Task 工具调用**：
   ```typescript
   if (block.type === "tool_use" && block.name === "Task") {
       console.log(`Subagent invoked: ${block.input.subagent_type}`);
   }
   ```

2. **识别子代理消息**：
   ```typescript
   if (msg.parent_tool_use_id) {
       // 这条消息来自子代理内部
   }
   ```

3. **调试和监控**：
   - 跟踪子代理调用
   - 监控子代理执行
   - 分析子代理行为

## 示例 4：恢复子代理

**文件：** `examples/29-subagent-resume.ts`

保存和恢复子代理的状态：

```typescript
import { type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '../lib/setup.js';

// 辅助函数：从消息内容提取 agentId
function extractAgentId(message: SDKMessage): string | undefined {
    if (!('message' in message)) return undefined;

    // 字符串化内容以便搜索，无需遍历嵌套块
    const content = JSON.stringify(message.message.content);
    const match = content.match(/agentId:\s*([a-f0-9-]+)/);
    return match?.[1];
}

let agentId: string | undefined;
let sessionId: string | undefined;

// 第一次调用 - 使用 Explore 子代理查找 API 端点
for await (const message of query({
    prompt: "Use the Explore agent to find all API endpoints in examples folder codebase",
    options: { allowedTools: ['Read', 'Grep', 'Glob', 'Task'] }
})) {
    // 从 ResultMessage 捕获 session_id（恢复会话需要）
    if ('session_id' in message) sessionId = message.session_id;

    // 在消息内容中搜索 agentId（出现在 Task 工具结果中）
    const extractedId = extractAgentId(message);
    if (extractedId) agentId = extractedId;

    // 检测子代理调用
    for (const block of message.message?.content ?? []) {
        if (block.type === "tool_use" && block.name === "Task") {
            console.log(`Subagent invoked: ${block.input.subagent_type}`);
        }
    }

    // 检查是否来自子代理
    if (message.parent_tool_use_id) {
        console.log("Message from subagent:");
        console.log(message.message.content);
        console.log("  (running inside subagent)");
    }

    // 打印最终结果
    if ('result' in message) console.log(message.result);
}

// 第二次调用 - 恢复并提出后续问题
if (agentId && sessionId) {
    for await (const message of query({
        prompt: `Resume agent ${agentId} and list the top 3 most complex endpoints`,
        options: {
            allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
            resume: sessionId  // 恢复会话
        }
    })) {
        if ('result' in message) console.log(message.result);
    }
}
```

**代码解析：**

1. **提取 agentId**：
   ```typescript
   const content = JSON.stringify(message.message.content);
   const match = content.match(/agentId:\s*([a-f0-9-]+)/);
   ```
   从 Task 工具结果中提取子代理 ID。

2. **保存状态**：
   ```typescript
   if ('session_id' in message) sessionId = message.session_id;
   if (extractedId) agentId = extractedId;
   ```

3. **恢复子代理**：
   ```typescript
   prompt: `Resume agent ${agentId} and ...`,
   options: { resume: sessionId }
   ```
   使用 agentId 和 sessionId 恢复子代理上下文。

## 内置子代理

SDK 提供了几个内置的专用子代理：

### Explore Agent

快速探索代码库：

```typescript
for await (const message of query({
    prompt: "Use the Explore agent to find all React components",
    options: {
        allowedTools: ['Read', 'Grep', 'Glob', 'Task']
    }
})) {
    // Explore 子代理会自动被调用
}
```

**特点：**
- 专门用于代码库探索
- 快速搜索和分析
- 支持多种搜索模式

### Bash Agent

命令执行专家：

```typescript
for await (const message of query({
    prompt: "Use the Bash agent to run tests",
    options: {
        allowedTools: ['Bash', 'Task']
    }
})) {
    // Bash 子代理会执行命令
}
```

### Plan Agent

软件架构规划：

```typescript
for await (const message of query({
    prompt: "Use the Plan agent to design the implementation",
    options: {
        allowedTools: ['Read', 'Task']
    }
})) {
    // Plan 子代理会创建实施计划
}
```

## 实战场景

### 场景 1：多阶段代码审查

```typescript
for await (const message of query({
    prompt: "Perform a comprehensive code review of the authentication module",
    options: {
        allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
        agents: {
            'security-reviewer': {
                description: 'Security expert for vulnerability analysis',
                prompt: `You are a security expert. Focus on:
- Authentication flaws
- SQL injection risks
- XSS vulnerabilities
- Insecure dependencies`,
                tools: ['Read', 'Grep', 'Glob'],
                model: 'opus'
            },
            'performance-reviewer': {
                description: 'Performance expert for optimization analysis',
                prompt: `You are a performance expert. Focus on:
- Slow database queries
- Memory leaks
- Inefficient algorithms
- Caching opportunities`,
                tools: ['Read', 'Grep', 'Glob'],
                model: 'sonnet'
            },
            'style-reviewer': {
                description: 'Code style and maintainability expert',
                prompt: `You are a code quality expert. Focus on:
- Code readability
- Naming conventions
- Code duplication
- Documentation quality`,
                tools: ['Read', 'Grep', 'Glob'],
                model: 'haiku'
            }
        }
    }
})) {
    if ('result' in message) console.log(message.result);
}
```

### 场景 2：测试和修复工作流

```typescript
for await (const message of query({
    prompt: "Run tests and fix any failures",
    options: {
        allowedTools: ['Read', 'Edit', 'Bash', 'Task'],
        agents: {
            'test-runner': {
                description: 'Test execution specialist',
                prompt: `Run test suites and analyze results.
Identify failing tests and their root causes.`,
                tools: ['Bash', 'Read', 'Grep']
            },
            'bug-fixer': {
                description: 'Bug fixing specialist',
                prompt: `Fix bugs identified by test failures.
Write clean, minimal fixes that address root causes.`,
                tools: ['Read', 'Edit', 'Grep']
            }
        }
    }
})) {
    if ('result' in message) console.log(message.result);
}
```

### 场景 3：文档生成管道

```typescript
for await (const message of query({
    prompt: "Generate comprehensive documentation for the API module",
    options: {
        allowedTools: ['Read', 'Write', 'Grep', 'Task'],
        agents: {
            'code-analyzer': {
                description: 'Code analysis for documentation extraction',
                prompt: `Analyze code to extract:
- Function signatures
- Parameter types
- Return values
- Usage examples`,
                tools: ['Read', 'Grep', 'Glob']
            },
            'doc-writer': {
                description: 'Technical documentation writer',
                prompt: `Write clear, comprehensive documentation.
Include:
- Overview and purpose
- API reference
- Usage examples
- Best practices`,
                tools: ['Write', 'Read']
            }
        }
    }
})) {
    if ('result' in message) console.log(message.result);
}
```

## 子代理最佳实践

### 1. 清晰的描述

```typescript
// ✅ 好的做法
description: 'Security expert for finding SQL injection, XSS, and auth vulnerabilities in web applications'

// ❌ 避免
description: 'Security agent'
```

### 2. 专业化提示词

```typescript
// ✅ 好的做法
prompt: `You are a React performance expert.

When analyzing components:
1. Check for unnecessary re-renders
2. Identify missing memoization
3. Look for expensive computations in render
4. Suggest React.memo, useMemo, useCallback

Provide specific code examples for each issue.`

// ❌ 避免
prompt: 'You are a React expert.'
```

### 3. 最小权限原则

```typescript
// ✅ 好的做法：只读审查
agents: {
    'code-reviewer': {
        description: '...',
        prompt: '...',
        tools: ['Read', 'Grep', 'Glob']  // 只读
    }
}

// ❌ 避免：过度授权
tools: ['Read', 'Edit', 'Bash', 'Write']  // 审查不需要修改权限
```

### 4. 合适的模型选择

```typescript
// 复杂任务使用 Opus
'architect': {
    description: 'System architecture design',
    prompt: '...',
    tools: ['Read'],
    model: 'opus'  // 需要深度思考
}

// 简单任务使用 Haiku
'formatter': {
    description: 'Code formatting',
    prompt: '...',
    tools: ['Read', 'Edit'],
    model: 'haiku'  // 快速且便宜
}
```

## 子代理通信

### 主 Agent → 子代理

主 Agent 通过 Task 工具调用子代理：

```typescript
// 主 Agent 内部（自动）
Task({
    subagent_type: 'code-reviewer',
    prompt: 'Review utils.py for security issues'
})
```

### 子代理 → 主 Agent

子代理返回结果给主 Agent：

```typescript
// 子代理完成后
return {
    content: [{
        type: "text",
        text: "Found 3 security issues:\n1. SQL injection...\n2. XSS..."
    }]
}
```

## 调试子代理

### 1. 监控调用

```typescript
for (const block of message.message?.content ?? []) {
    if (block.type === "tool_use" && block.name === "Task") {
        console.log('Subagent called:', block.input.subagent_type);
        console.log('With prompt:', block.input.prompt);
    }
}
```

### 2. 跟踪执行

```typescript
if (message.parent_tool_use_id) {
    console.log('Inside subagent:', message.parent_tool_use_id);
    console.log('Message:', message.message.content);
}
```

### 3. 日志记录

在子代理提示词中添加日志指令：

```typescript
prompt: `You are a code reviewer.

IMPORTANT: Start your response with a summary of your analysis approach.

When reviewing code:
- Log each file you examine
- Note key findings as you discover them
- Provide a final summary`
```

## 子代理 vs 自定义工具

| 特性 | 子代理 | 自定义工具 |
|------|--------|-----------|
| 复杂度 | 高（完整 Agent） | 低（单一功能） |
| 上下文 | 独立上下文 | 共享上下文 |
| 工具访问 | 可以使用多个工具 | 单一功能实现 |
| 适用场景 | 复杂多步骤任务 | 简单原子操作 |
| 成本 | 较高 | 较低 |

**选择建议：**
- 简单操作 → 自定义工具
- 复杂任务 → 子代理

## 常见问题

### Q: 子代理可以调用其他子代理吗？

**A:** 可以，如果子代理有 `Task` 工具权限。但要注意避免无限递归。

### Q: 如何限制子代理的执行时间？

**A:** 使用 `maxTurns` 选项：

```typescript
options: {
    maxTurns: 5,  // 限制最多 5 轮对话
    agents: { ... }
}
```

### Q: 子代理可以访问主 Agent 的上下文吗？

**A:** 不能直接访问，但可以通过 Task 工具的 prompt 参数传递信息。

### Q: 如何选择合适的模型？

**A:**
- **Opus**: 复杂推理、架构设计
- **Sonnet**: 平衡性能和成本
- **Haiku**: 简单任务、快速响应

## 下一步

- [斜杠命令](./12-slash-commands.md) - 快捷命令系统
- [技能系统](./13-skills.md) - 可复用的技能模块

## 相关示例

- `examples/26-subagent-programmatic-definition.ts` - 编程式定义
- `examples/27-subagent-dynamic-agent-configuration.ts` - 动态配置
- `examples/28-subagent-detect-subagent-invocation.ts` - 检测调用
- `examples/29-subagent-resume.ts` - 恢复子代理
