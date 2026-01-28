---
layout: default
title: 系统提示词
nav_order: 10
parent: 输出与提示
---

# 系统提示词

## 概述

系统提示词（System Prompts）是 Agent 的行为准则，定义了 Agent 的角色、风格和工作方式。通过自定义系统提示词，你可以：
- 定制 Agent 的专业领域
- 设置代码风格和规范
- 加载项目特定的指导方针（CLAUDE.md）
- 创建可复用的输出风格

## 系统提示词类型

SDK 支持三种方式设置系统提示词：

```
┌──────────────────────────────────────────────────────────┐
│              系统提示词配置方式                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. 预设 (Preset)                                         │
│     ├─ claude_code (默认)                                │
│     └─ 其他内置预设                                       │
│                                                          │
│  2. 自定义字符串 (Custom String)                          │
│     └─ 完全自定义的提示词                                 │
│                                                          │
│  3. 输出风格 (Output Styles)                              │
│     └─ .claude/output-styles/*.md                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 配置结构

### 预设模式

```typescript
systemPrompt: {
    type: "preset",
    preset: "claude_code",  // 使用内置预设
    append: "额外指令..."     // 可选：追加内容
}
```

### 自定义字符串

```typescript
systemPrompt: "你的自定义提示词..."
```

## 示例 1：加载 CLAUDE.md

**文件：** `examples/16-system-prompts-claude-md.ts`

CLAUDE.md 是项目级别的配置文件，包含项目特定的指导方针。

```typescript
import { query } from '../lib/setup.js';

// 重要：必须指定 settingSources 才能加载 CLAUDE.md
// 仅使用 claude_code 预设不会自动加载 CLAUDE.md
const messages = [];

for await (const message of query({
    prompt: "Add a new React component for user profiles",
    options: {
        systemPrompt: {
            type: "preset",
            preset: "claude_code",  // 使用 Claude Code 的系统提示词
        },
        settingSources: ["project"],  // 必需：从项目加载 CLAUDE.md
    },
})) {
    messages.push(message);
}

// 现在 Claude 可以访问项目的 CLAUDE.md 指导方针
```

**代码解析：**

1. **CLAUDE.md 位置**：
   - 项目根目录：`<project-root>/CLAUDE.md`
   - 用户全局：`~/.claude/CLAUDE.md`

2. **settingSources 配置**：
   ```typescript
   settingSources: ["project"]  // 加载项目级别的 CLAUDE.md
   // 或
   settingSources: ["user"]     // 加载用户全局的 CLAUDE.md
   // 或
   settingSources: ["project", "user"]  // 两者都加载
   ```

3. **CLAUDE.md 内容示例**：
   ```markdown
   # 项目指导方针

   ## 代码风格
   - 使用 TypeScript 严格模式
   - 遵循 Airbnb 代码规范
   - 所有函数必须有 JSDoc 注释

   ## 架构原则
   - 采用模块化设计
   - 组件必须可测试
   - 避免循环依赖
   ```

## 示例 2：创建输出风格

**文件：** `examples/17-system-prompts-output-styles.ts`

输出风格（Output Styles）是可复用的系统提示词模板。

```typescript
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

async function createOutputStyle(
    name: string,
    description: string,
    prompt: string
) {
    // 用户级别：~/.claude/output-styles
    // 项目级别（推荐）：<project-root>/.claude/output-styles
    const outputStylesDir = join(process.cwd(), ".claude", "output-styles");

    await mkdir(outputStylesDir, { recursive: true });

    const content = `---
name: ${name}
description: ${description}
---

${prompt}`;

    const filePath = join(
        outputStylesDir,
        `${name.toLowerCase().replace(/\s+/g, "-")}.md`
    );
    await writeFile(filePath, content, "utf-8");
}

// 示例：创建代码审查专家
await createOutputStyle(
    "Code Reviewer",
    "Thorough code review assistant",
    `You are an expert code reviewer.

For every code submission:
1. Check for bugs and security issues
2. Evaluate performance
3. Suggest improvements
4. Rate code quality (1-10)`
);
```

**代码解析：**

1. **输出风格文件格式**：
   ```markdown
   ---
   name: 风格名称
   description: 简短描述
   ---

   系统提示词内容...
   ```

2. **文件位置**：
   - 项目级别：`<project-root>/.claude/output-styles/`
   - 用户级别：`~/.claude/output-styles/`

3. **使用输出风格**：
   创建后，可以在 Claude Code CLI 中使用 `/style` 命令选择。

## 示例 3：追加系统提示词

**文件：** `examples/18-system-prompts-systemPrompt-append.ts`

在预设基础上追加额外指令。

```typescript
import { query } from "../lib/setup.js";

const messages = [];

for await (const message of query({
    prompt: "Help me write a Python function to calculate fibonacci numbers",
    options: {
        allowedTools: ['Write'],
        systemPrompt: {
            type: "preset",
            preset: "claude_code",
            append: "Always include detailed docstrings and type hints in Python code.",
        },
    },
})) {
    messages.push(message);
    if (message.type === "assistant") {
        console.log(message.message.content);
    }
}
```

**代码解析：**

1. **append 字段**：
   ```typescript
   systemPrompt: {
       type: "preset",
       preset: "claude_code",  // 基础预设
       append: "额外指令..."     // 追加内容
   }
   ```

2. **执行顺序**：
   ```
   最终提示词 = 预设内容 + append 内容
   ```

3. **使用场景**：
   - 在标准预设基础上添加项目特定规则
   - 临时添加额外约束
   - 微调 Agent 行为

## 示例 4：完全自定义提示词

**文件：** `examples/19-system-prompts-custom.ts`

使用完全自定义的系统提示词。

```typescript
import { query } from "../lib/setup.js";

const customPrompt = `You are a Python coding specialist.
Follow these guidelines:
- Write clean, well-documented code
- Use type hints for all functions
- Include comprehensive docstrings
- Prefer functional programming patterns when appropriate
- Always explain your code choices`;

const messages = [];

for await (const message of query({
    prompt: "Create a data processing pipeline",
    options: {
        systemPrompt: customPrompt,  // 直接传入字符串
    },
})) {
    messages.push(message);
    if (message.type === "assistant") {
        console.log("----- Assistant Message -----");
        console.log(message.message.content);
    }
}
```

**代码解析：**

1. **自定义提示词**：
   ```typescript
   systemPrompt: "你的自定义提示词..."  // 字符串形式
   ```

2. **完全控制**：
   - 不使用任何预设
   - 完全自定义 Agent 行为
   - 适合特殊场景

## 系统提示词最佳实践

### 1. 角色定义

明确 Agent 的角色：

```typescript
const systemPrompt = `You are a senior software architect specializing in microservices.

Your expertise includes:
- Distributed systems design
- API design and versioning
- Database sharding strategies
- Performance optimization

When reviewing code or designs:
1. Consider scalability implications
2. Identify potential bottlenecks
3. Suggest industry best practices
4. Provide concrete examples`;
```

### 2. 代码风格规范

定义代码标准：

```typescript
const systemPrompt = `You are a TypeScript expert following these standards:

Code Style:
- Use functional programming patterns
- Prefer const over let
- Use arrow functions
- Avoid any type

Documentation:
- All public functions must have JSDoc
- Include @param and @returns
- Add usage examples for complex functions

Testing:
- Write unit tests for all functions
- Use describe/it structure
- Aim for 80%+ code coverage`;
```

### 3. 输出格式

规范输出结构：

```typescript
const systemPrompt = `When analyzing code, always provide:

## Summary
Brief overview of findings

## Issues Found
List of problems with severity (Critical/High/Medium/Low)

## Recommendations
Specific actionable improvements

## Code Examples
Show before/after comparisons`;
```

### 4. 领域知识

注入专业知识：

```typescript
const systemPrompt = `You are a financial software expert.

Key principles:
- All monetary calculations use Decimal type (never float)
- Currency codes follow ISO 4217
- Timestamps are UTC with timezone info
- Audit logs for all financial transactions
- Idempotency for payment operations

Security requirements:
- PCI DSS compliance
- Data encryption at rest and in transit
- Regular security audits`;
```

## 实战场景

### 场景 1：代码审查专家

```typescript
const codeReviewPrompt = `You are an expert code reviewer with 10+ years of experience.

Review Checklist:
✓ Code correctness and logic
✓ Security vulnerabilities
✓ Performance issues
✓ Code maintainability
✓ Test coverage
✓ Documentation quality

For each issue:
- Severity: Critical/High/Medium/Low
- Location: File and line number
- Description: What's wrong
- Solution: How to fix
- Example: Show corrected code

Rate overall code quality: 1-10`;

for await (const message of query({
    prompt: "Review the authentication module",
    options: {
        systemPrompt: codeReviewPrompt,
        allowedTools: ['Read', 'Grep']
    }
})) {
    // 处理审查结果
}
```

### 场景 2：文档生成器

```typescript
const docGeneratorPrompt = `You are a technical documentation specialist.

Documentation Standards:
- Clear, concise language
- Include code examples
- Add diagrams where helpful
- Provide troubleshooting section
- Link to related docs

Structure:
# Title
## Overview
## Installation
## Usage
### Basic Example
### Advanced Usage
## API Reference
## Troubleshooting
## FAQ`;

for await (const message of query({
    prompt: "Generate documentation for the API module",
    options: {
        systemPrompt: docGeneratorPrompt,
        allowedTools: ['Read', 'Write']
    }
})) {
    // 生成文档
}
```

### 场景 3：测试生成器

```typescript
const testGeneratorPrompt = `You are a test automation expert.

Testing Principles:
- Write clear, descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases and error conditions
- Mock external dependencies
- Use data-driven tests when appropriate

Test Structure:
describe('ComponentName', () => {
    describe('methodName', () => {
        it('should handle normal case', () => {});
        it('should handle edge case', () => {});
        it('should throw on invalid input', () => {});
    });
});`;

for await (const message of query({
    prompt: "Generate tests for the UserService class",
    options: {
        systemPrompt: testGeneratorPrompt,
        allowedTools: ['Read', 'Write']
    }
})) {
    // 生成测试
}
```

### 场景 4：重构助手

```typescript
const refactoringPrompt = `You are a refactoring specialist.

Refactoring Goals:
- Improve code readability
- Reduce complexity
- Eliminate duplication
- Enhance maintainability
- Preserve functionality

Techniques:
- Extract method
- Extract class
- Rename for clarity
- Simplify conditionals
- Remove dead code

For each refactoring:
1. Explain the problem
2. Show current code
3. Show refactored code
4. Explain benefits`;

for await (const message of query({
    prompt: "Refactor the payment processing module",
    options: {
        systemPrompt: refactoringPrompt,
        allowedTools: ['Read', 'Edit']
    }
})) {
    // 执行重构
}
```

## CLAUDE.md 完整示例

创建项目级别的 CLAUDE.md：

```markdown
# 项目：电商平台后端

## 技术栈
- Node.js 18+ with TypeScript
- Express.js for API
- PostgreSQL with Prisma ORM
- Redis for caching
- Jest for testing

## 代码规范

### TypeScript
- 启用严格模式
- 禁止使用 any
- 所有函数必须有返回类型
- 使用接口定义数据结构

### 命名约定
- 文件：kebab-case (user-service.ts)
- 类：PascalCase (UserService)
- 函数/变量：camelCase (getUserById)
- 常量：UPPER_SNAKE_CASE (MAX_RETRY_COUNT)

### 目录结构
```
src/
  ├── controllers/    # HTTP 请求处理
  ├── services/       # 业务逻辑
  ├── repositories/   # 数据访问
  ├── models/         # 数据模型
  ├── utils/          # 工具函数
  └── types/          # TypeScript 类型
```

## API 设计

### RESTful 规范
- GET: 查询资源
- POST: 创建资源
- PUT: 完整更新
- PATCH: 部分更新
- DELETE: 删除资源

### 响应格式
```typescript
{
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    page: number;
    total: number;
  };
}
```

## 错误处理
- 使用自定义错误类
- 所有错误必须记录日志
- API 返回标准错误格式
- 敏感信息不出现在错误消息中

## 安全要求
- 所有输入必须验证
- 使用参数化查询防止 SQL 注入
- 密码使用 bcrypt 哈希
- JWT token 过期时间 1 小时
- 实现速率限制

## 测试要求
- 单元测试覆盖率 > 80%
- 集成测试覆盖关键流程
- 使用 Mock 隔离外部依赖
- CI/CD 自动运行测试

## 文档要求
- 所有公共 API 必须有 JSDoc
- README.md 包含快速开始指南
- API 文档使用 OpenAPI/Swagger
- 架构决策记录在 docs/adr/
```

## 输出风格模板库

### 简洁风格

```markdown
---
name: Concise
description: Brief, to-the-point responses
---

Provide concise, focused responses:
- Get straight to the point
- Avoid unnecessary explanations
- Use bullet points
- Include only essential code
```

### 详细教学风格

```markdown
---
name: Tutorial
description: Detailed explanatory style
---

Provide comprehensive, educational responses:
- Explain concepts thoroughly
- Include background information
- Show multiple examples
- Add tips and best practices
- Anticipate follow-up questions
```

### 调试风格

```markdown
---
name: Debugger
description: Systematic problem-solving approach
---

Follow systematic debugging process:
1. Identify symptoms
2. Form hypotheses
3. Test hypotheses
4. Isolate root cause
5. Propose solutions
6. Verify fixes

For each step, show:
- What to check
- How to check it
- What results mean
```

## 系统提示词组合

结合多种配置方式：

```typescript
// 1. 基础预设
const basePrompt = {
    type: "preset" as const,
    preset: "claude_code"
};

// 2. 加载项目指导
const withProject = {
    ...basePrompt,
    settingSources: ["project"]
};

// 3. 追加特定指令
const withAppend = {
    ...basePrompt,
    append: "Focus on performance optimization"
};

// 4. 完全自定义（替换预设）
const custom = `You are a performance optimization expert...`;

// 根据场景选择
for await (const message of query({
    prompt: "Optimize the database queries",
    options: {
        systemPrompt: withAppend  // 选择合适的配置
    }
})) {
    // ...
}
```

## 常见问题

### Q: systemPrompt 和 CLAUDE.md 有什么区别？

**A:**
- **systemPrompt**: 代码中动态设置，每次查询可以不同
- **CLAUDE.md**: 项目级别的静态配置，需要 settingSources 加载

### Q: 如何调试系统提示词？

**A:** 可以在 Agent 响应中观察行为是否符合预期。如果不符合，尝试：
- 使提示词更具体
- 添加示例
- 使用更明确的指令

### Q: 系统提示词有长度限制吗？

**A:** 有上下文窗口限制。建议：
- 保持提示词简洁
- 只包含必要信息
- 使用清晰的结构

### Q: 可以同时使用预设和自定义提示词吗？

**A:** 不可以直接组合，但可以：
- 使用 `append` 在预设基础上追加
- 或完全使用自定义字符串（不使用预设）

## 下一步

- [MCP 服务器](./09-mcp-servers.md) - 扩展 Agent 能力
- [自定义工具](./10-custom-tools.md) - 创建专用工具

## 相关示例

- `examples/16-system-prompts-claude-md.ts` - 加载 CLAUDE.md
- `examples/17-system-prompts-output-styles.ts` - 创建输出风格
- `examples/18-system-prompts-systemPrompt-append.ts` - 追加提示词
- `examples/19-system-prompts-custom.ts` - 自定义提示词
