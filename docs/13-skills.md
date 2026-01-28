---
layout: default
title: 技能系统
nav_order: 15
parent: 高级特性
---

# 技能系统

## 概述

技能（Skills）是可复用的功能模块，比斜杠命令更强大。技能可以：
- 包含完整的工作流程
- 集成自定义工具和 MCP 服务器
- 提供复杂的交互逻辑
- 跨项目复用

## 技能 vs 斜杠命令

| 特性 | 技能 | 斜杠命令 |
|------|------|---------|
| 复杂度 | 高（完整功能） | 低（快捷提示词） |
| 工具集成 | ✅ 支持 | ❌ 不支持 |
| MCP 集成 | ✅ 支持 | ❌ 不支持 |
| 交互逻辑 | ✅ 复杂流程 | ❌ 简单提示 |
| 适用场景 | 复杂工作流 | 快捷操作 |

## 技能结构

技能位于 `.claude/skills/` 目录：

```
.claude/
└── skills/
    ├── pdf-processor/
    │   ├── skill.json       # 技能配置
    │   ├── system-prompt.md # 系统提示词
    │   └── tools/           # 自定义工具（可选）
    └── code-reviewer/
        ├── skill.json
        └── system-prompt.md
```

## 使用默认技能

**文件：** `examples/36-skill-default-skill.ts`

SDK 提供了一些内置技能：

```typescript
import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Help me process this claudes-constitution.pdf PDF document",
    options: {
        cwd: process.cwd(),  // 项目目录（包含 .claude/skills/）
        settingSources: ["user", "project"],  // 从文件系统加载技能
        allowedTools: ["Skill", "Read", "Write", "Bash"]  // 启用 Skill 工具
    }
})) {
    console.log(message);
}
```

**代码解析：**

1. **启用技能工具**：
   ```typescript
   allowedTools: ["Skill", "Read", "Write", "Bash"]
   ```
   必须包含 `Skill` 工具。

2. **加载技能**：
   ```typescript
   settingSources: ["user", "project"]
   ```
   从用户和项目目录加载技能。

3. **自动识别**：
   Agent 识别 PDF 文件，自动调用 `pdf` 技能。

## 内置技能

### PDF 处理技能

处理 PDF 文档：

```typescript
for await (const message of query({
    prompt: "Extract text from document.pdf",
    options: {
        settingSources: ["user", "project"],
        allowedTools: ["Skill", "Read", "Write"]
    }
})) {
    // PDF 技能自动处理
}
```

### 代码审查技能

执行代码审查：

```typescript
for await (const message of query({
    prompt: "Review the authentication module",
    options: {
        settingSources: ["user", "project"],
        allowedTools: ["Skill", "Read", "Grep"]
    }
})) {
    // 代码审查技能
}
```

## 创建自定义技能

### 1. 技能配置

创建 `.claude/skills/my-skill/skill.json`：

```json
{
    "name": "my-skill",
    "version": "1.0.0",
    "description": "Custom skill for specific tasks",
    "triggers": [
        "keyword1",
        "keyword2"
    ],
    "tools": [
        "Read",
        "Write",
        "Bash"
    ],
    "mcpServers": {
        "custom-server": {
            "command": "node",
            "args": ["./server.js"]
        }
    }
}
```

### 2. 系统提示词

创建 `.claude/skills/my-skill/system-prompt.md`：

```markdown
# My Custom Skill

You are an expert in [domain]. When the user requests [task]:

## Workflow

1. Analyze the input
2. Process using [method]
3. Generate output
4. Validate results

## Guidelines

- Be thorough and accurate
- Provide clear explanations
- Include examples
- Handle errors gracefully
```

### 3. 自定义工具（可选）

创建 `.claude/skills/my-skill/tools/my-tool.ts`：

```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

export const myTool = tool(
    "my_tool",
    "Tool description",
    {
        input: z.string().describe("Input parameter")
    },
    async (args) => {
        // 工具逻辑
        return {
            content: [{
                type: "text",
                text: "Result"
            }]
        };
    }
);
```

## 实战示例

### 数据分析技能

`.claude/skills/data-analyzer/skill.json`:

```json
{
    "name": "data-analyzer",
    "version": "1.0.0",
    "description": "Analyze datasets and generate insights",
    "triggers": ["analyze data", "data analysis", "statistics"],
    "tools": ["Read", "Write"],
    "mcpServers": {
        "postgres": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"]
        }
    }
}
```

`.claude/skills/data-analyzer/system-prompt.md`:

```markdown
# Data Analysis Expert

You are a data analyst specializing in statistical analysis and visualization.

## Analysis Workflow

1. **Data Loading**
   - Read from database or files
   - Validate data quality
   - Handle missing values

2. **Exploratory Analysis**
   - Calculate descriptive statistics
   - Identify patterns and trends
   - Detect outliers

3. **Insights Generation**
   - Key findings
   - Recommendations
   - Visualizations (if requested)

4. **Report Creation**
   - Executive summary
   - Detailed analysis
   - Supporting data

## Output Format

Provide results in structured format:
- Summary statistics
- Key insights
- Actionable recommendations
```

使用：

```typescript
for await (const message of query({
    prompt: "Analyze the user behavior data from last month",
    options: {
        settingSources: ["project"],
        allowedTools: ["Skill", "Read", "Write", "mcp__postgres__*"]
    }
})) {
    console.log(message);
}
```

### API 测试技能

`.claude/skills/api-tester/skill.json`:

```json
{
    "name": "api-tester",
    "version": "1.0.0",
    "description": "Test and validate API endpoints",
    "triggers": ["test api", "api testing", "endpoint test"],
    "tools": ["Read", "Write", "Bash"]
}
```

`.claude/skills/api-tester/system-prompt.md`:

```markdown
# API Testing Specialist

You are an API testing expert. Test endpoints thoroughly:

## Testing Process

1. **Endpoint Discovery**
   - Read API documentation
   - List all endpoints
   - Identify parameters

2. **Test Case Generation**
   - Happy path tests
   - Edge cases
   - Error scenarios
   - Security tests

3. **Execution**
   - Use curl or HTTP clients
   - Validate responses
   - Check status codes
   - Verify data format

4. **Reporting**
   - Test results summary
   - Failed tests with details
   - Performance metrics
   - Security findings

## Test Categories

- Functionality
- Performance
- Security
- Data validation
- Error handling
```

### 文档生成技能

`.claude/skills/doc-generator/skill.json`:

```json
{
    "name": "doc-generator",
    "version": "1.0.0",
    "description": "Generate comprehensive documentation",
    "triggers": ["generate docs", "documentation", "write docs"],
    "tools": ["Read", "Write", "Grep", "Glob"]
}
```

`.claude/skills/doc-generator/system-prompt.md`:

```markdown
# Technical Documentation Writer

You are a technical writer specializing in developer documentation.

## Documentation Standards

### Structure
1. Overview
2. Installation
3. Quick Start
4. API Reference
5. Examples
6. Troubleshooting
7. FAQ

### Style Guide
- Clear, concise language
- Code examples for all features
- Visual aids (diagrams, screenshots)
- Step-by-step instructions
- Troubleshooting tips

### Code Examples
- Complete, runnable examples
- Commented for clarity
- Cover common use cases
- Include error handling

## Output Formats
- Markdown (default)
- HTML (if requested)
- PDF (if requested)
```

## 技能触发

### 自动触发

Agent 根据关键词自动触发技能：

```json
{
    "triggers": ["analyze data", "statistics", "dataset"]
}
```

### 显式调用

用户明确指定技能：

```typescript
prompt: "Use the data-analyzer skill to process sales data"
```

## 技能组合

技能可以协作完成复杂任务：

```typescript
for await (const message of query({
    prompt: "Analyze the API logs, generate a report, and create documentation",
    options: {
        settingSources: ["project"],
        allowedTools: [
            "Skill",
            "Read",
            "Write",
            "mcp__*"  // 所有 MCP 工具
        ]
    }
})) {
    // Agent 可能依次调用：
    // 1. log-analyzer 技能
    // 2. report-generator 技能
    // 3. doc-generator 技能
}
```

## 技能管理

### 列出可用技能

```typescript
for await (const message of query({
    prompt: "List available skills",
    options: {
        settingSources: ["user", "project"],
        allowedTools: ["Skill"]
    }
})) {
    if (message.type === "system" && message.subtype === "init") {
        console.log("Available skills:", message.skills);
    }
}
```

### 技能位置

- 用户级别：`~/.claude/skills/`
- 项目级别：`<project-root>/.claude/skills/`

## 最佳实践

### 1. 清晰的触发词

```json
{
    "triggers": [
        "analyze database",
        "database analysis",
        "query database",
        "db stats"
    ]
}
```

### 2. 完整的工作流

在 system-prompt.md 中详细描述步骤：

```markdown
## Workflow

1. **Step 1**: Description
   - Sub-task A
   - Sub-task B

2. **Step 2**: Description
   - Sub-task C
   - Sub-task D

3. **Step 3**: Description
   - Output format
   - Validation
```

### 3. 错误处理

```markdown
## Error Handling

If errors occur:
1. Log the error clearly
2. Attempt recovery if possible
3. Provide user-friendly error messages
4. Suggest next steps
```

### 4. 文档化

在技能目录添加 `README.md`：

```markdown
# My Skill

## Description
What this skill does...

## Usage
How to use this skill...

## Examples
```typescript
// Example code
```

## Requirements
- Dependencies
- Environment variables
- Configuration
```

## 常见问题

### Q: 技能和子代理有什么区别？

**A:**
- **技能**: 完整的功能模块，包含工具和配置
- **子代理**: 专门的 Agent，只有提示词和工具列表

### Q: 如何调试技能？

**A:** 在 system-prompt.md 中添加调试指令：

```markdown
## Debugging

When executing:
1. Log each major step
2. Output intermediate results
3. Explain decisions made
```

### Q: 技能可以调用其他技能吗？

**A:** 可以，如果 Agent 有 `Skill` 工具权限。

## 下一步

- [高级特性](./14-advanced-features.md) - 成本追踪、监控、插件

## 相关示例

- `examples/36-skill-default-skill.ts` - 使用默认技能
