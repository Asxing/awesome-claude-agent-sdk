---
layout: default
title: 斜杠命令
nav_order: 14
parent: 高级特性
---

# 斜杠命令

## 概述

斜杠命令（Slash Commands）是快捷命令系统，提供便捷的操作入口。SDK 支持：
- 内置命令（/compact, /clear, /help 等）
- 自定义命令（项目特定的快捷操作）
- 命令发现和列表

## 命令格式

```typescript
prompt: "/command-name arguments"
```

## 发现可用命令

**文件：** `examples/31-slash-command-discover.ts`

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Hello Claude",
    options: { maxTurns: 1 }
})) {
    if (message.type === "system" && message.subtype === "init") {
        console.log("Available slash commands:", message.slash_commands);
        // 输出: ["/compact", "/clear", "/help"]
    }
}
```

## 内置命令

### /compact

压缩对话历史：

```typescript
for await (const message of query({
    prompt: "/compact",
    options: { resume: sessionId }
})) {
    // 对话历史被压缩，节省上下文
}
```

### /clear

清除对话历史：

```typescript
for await (const message of query({
    prompt: "/clear",
    options: { resume: sessionId }
})) {
    // 对话历史被清除
}
```

### /help

显示帮助信息：

```typescript
for await (const message of query({
    prompt: "/help"
})) {
    // 显示可用命令和使用说明
}
```

## 自定义命令

**文件：** `examples/34-slash-command-custom-command.ts`

### 创建自定义命令

在项目根目录创建 `.claude/slash-commands/` 目录：

```bash
mkdir -p .claude/slash-commands
```

创建命令文件 `.claude/slash-commands/refactor.md`：

```markdown
---
name: refactor
description: Refactor code for better quality
---

You are a refactoring expert. When the user provides a file:

1. Analyze the code structure
2. Identify improvement opportunities
3. Suggest refactorings for:
   - Code readability
   - Performance optimization
   - Design patterns
   - Error handling

Provide specific code examples.
```

### 使用自定义命令

```typescript
import { query } from "../lib/setup.js";

// 使用自定义命令
for await (const message of query({
    prompt: "/refactor utils.py",
    options: {
        maxTurns: 3,
        settingSources: ["project"]  // 加载项目命令
    }
})) {
    if (message.type === "assistant") {
        console.log("Refactoring suggestions:", message.message);
    }
}

// 自定义命令出现在命令列表中
for await (const message of query({
    prompt: "Hello",
    options: { maxTurns: 1, settingSources: ["project"] }
})) {
    if (message.type === "system" && message.subtype === "init") {
        console.log("Available commands:", message.slash_commands);
        // 输出: ["/compact", "/clear", "/help", "/refactor", "/security-check"]
    }
}
```

## 命令文件格式

```markdown
---
name: command-name
description: Short description
---

System prompt content for this command...
```

## 实战示例

### 安全检查命令

`.claude/slash-commands/security-check.md`:

```markdown
---
name: security-check
description: Perform security audit on code
---

You are a security auditor. Analyze the provided code for:

1. SQL Injection vulnerabilities
2. XSS risks
3. Authentication flaws
4. Insecure dependencies
5. Hardcoded credentials

For each issue found:
- Severity: Critical/High/Medium/Low
- Location: File and line number
- Description: What's wrong
- Fix: How to resolve it
```

使用：

```typescript
for await (const message of query({
    prompt: "/security-check src/auth.ts",
    options: { settingSources: ["project"] }
})) {
    // 执行安全检查
}
```

### 文档生成命令

`.claude/slash-commands/docs.md`:

```markdown
---
name: docs
description: Generate documentation for code
---

You are a technical writer. Generate comprehensive documentation:

## Overview
Brief description of the module

## API Reference
- Function signatures
- Parameters
- Return values
- Examples

## Usage
Practical examples

## Best Practices
Recommendations
```

### 测试生成命令

`.claude/slash-commands/test.md`:

```markdown
---
name: test
description: Generate unit tests
---

You are a test automation expert. Generate tests using:

- AAA pattern (Arrange, Act, Assert)
- Edge cases
- Error conditions
- Mock external dependencies

Follow the project's testing framework conventions.
```

## 命令参数

命令可以接受参数：

```typescript
// 带文件路径
prompt: "/refactor src/utils.ts"

// 带多个参数
prompt: "/test UserService --coverage"

// 带选项
prompt: "/docs --format markdown --output docs/"
```

## 最佳实践

### 1. 清晰的命令名称

```markdown
✅ 好的做法
---
name: security-audit
description: Comprehensive security vulnerability scan
---

❌ 避免
---
name: sec
description: Security
---
```

### 2. 详细的描述

```markdown
---
name: refactor
description: Refactor code to improve readability, performance, and maintainability. Suggests specific improvements with code examples.
---
```

### 3. 专业化的提示词

```markdown
---
name: optimize
description: Performance optimization expert
---

You are a performance optimization specialist with expertise in:
- Algorithm complexity analysis
- Memory optimization
- Database query optimization
- Caching strategies

When analyzing code:
1. Profile performance bottlenecks
2. Suggest specific optimizations
3. Provide benchmarks when possible
4. Consider trade-offs
```

## 命令位置

- 用户级别：`~/.claude/slash-commands/`
- 项目级别：`<project-root>/.claude/slash-commands/`

优先级：项目级别 > 用户级别

## 常见问题

### Q: 如何传递复杂参数给命令？

**A:** 在提示词中自然描述：

```typescript
prompt: "/refactor src/utils.ts focusing on error handling and type safety"
```

### Q: 命令可以调用工具吗？

**A:** 可以，命令本质上是系统提示词，Agent 可以使用配置的工具。

### Q: 如何更新命令？

**A:** 直接编辑 `.claude/slash-commands/` 中的文件，下次查询时会自动加载。

## 下一步

- [技能系统](./13-skills.md) - 更强大的可复用模块
- [高级特性](./14-advanced-features.md) - 成本追踪、监控等

## 相关示例

- `examples/31-slash-command-discover.ts` - 发现命令
- `examples/32-slash-command-compact.ts` - 使用 compact
- `examples/33-slash-command-clear.ts` - 使用 clear
- `examples/34-slash-command-custom-command.ts` - 自定义命令
- `examples/35-slash-command-custom-arguments.ts` - 命令参数
