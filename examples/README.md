# Claude Agent SDK 示例集

这个目录包含了使用 Claude Agent SDK 的各种示例,展示不同的使用场景和最佳实践。

## 📚 示例列表

### [01-basic-query.ts](01-basic-query.ts)
**基础查询示例**

展示最简单的 Agent 查询用法:
- 简单的提示词查询
- 基础工具集使用 (Read, Glob, Grep)
- 结果处理

运行:
```bash
npx tsx examples/01-basic-query.ts
```

### [02-modify-file.ts](02-modify-file.ts)
**文件修改示例**

展示如何让 Agent 自动修改文件:
- 复杂的提示词和系统提示
- 文件编辑工具 (Edit, Bash, WebSearch)
- 自动批准编辑模式 (`permissionMode: "acceptEdits"`)
- 消息流处理

运行:
```bash
npx tsx examples/02-modify-file.ts
```

### [03-streaming-input.ts](03-streaming-input.ts)
**流式输入示例**

展示如何使用异步生成器进行多轮交互:
- 异步生成器模式
- 多轮对话
- 图片输入支持
- 动态消息生成

运行:
```bash
npx tsx examples/03-streaming-input.ts
```

## 🚀 快速开始

### 运行单个示例

```bash
# 方式 1: 使用 npx tsx
npx tsx examples/01-basic-query.ts

# 方式 2: 使用 npm script (需要完整路径)
npm run example 01-basic-query.ts
```

### 静默模式运行

如果不想显示配置信息,使用 `SHOW_CONFIG=false`:

```bash
SHOW_CONFIG=false npx tsx examples/01-basic-query.ts
```

## 📝 如何添加新示例

1. **创建新文件**

在 `examples/` 目录下创建新的 `.ts` 文件,例如 `04-my-example.ts`

2. **导入公共初始化**

在文件开头添加:
```typescript
import "../lib/setup.js";
import { query } from "@anthropic-ai/claude-agent-sdk";
```

3. **编写业务逻辑**

专注于你的核心功能,无需重复环境初始化:
```typescript
for await (const message of query({
    prompt: "Your prompt here",
    options: {
        allowedTools: ["Read", "Glob", "Grep"],
        // ... 其他选项
    }
})) {
    // 处理响应
}
```

4. **测试运行**

```bash
npx tsx examples/04-my-example.ts
```

## 🛠️ 常用配置选项

### allowedTools
Agent 可以使用的工具列表:
- `Read` - 读取文件
- `Write` - 写入文件
- `Edit` - 编辑文件
- `Glob` - 文件匹配
- `Grep` - 内容搜索
- `Bash` - 执行 Shell 命令
- `WebSearch` - 网络搜索

### permissionMode
权限模式:
- `"ask"` (默认) - 每次操作都询问
- `"acceptEdits"` - 自动批准编辑操作
- `"acceptAll"` - 自动批准所有操作

### systemPrompt
系统提示词,用于设定 Agent 的角色和行为规范。

示例:
```typescript
systemPrompt: "You are a senior Python developer. Always follow PEP 8 style guidelines."
```

## 🔧 环境配置

所有示例共享相同的环境配置,通过 [../lib/setup.ts](../lib/setup.ts) 自动加载。

配置文件: `.env`
```
ANTHROPIC_AUTH_TOKEN=your-token-here
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_CUSTOM_HEADERS=X-Working-Dir: $PWD
```

`$PWD` 会自动替换为当前工作目录。

## 💡 最佳实践

1. **保持示例简洁** - 每个示例专注于一个核心功能
2. **添加注释** - 解释关键配置和业务逻辑
3. **错误处理** - 考虑添加 try-catch 处理异常情况
4. **命名规范** - 使用数字前缀保持示例顺序 (01-, 02-, ...)

## 📖 更多资源

- [Claude Agent SDK 文档](https://github.com/anthropics/claude-agent-sdk)
- [Claude API 文档](https://docs.anthropic.com/)
- [项目根目录](../) - 查看原始示例文件(向后兼容)

---

**提示**: 如果你需要修改环境初始化逻辑,只需编辑 [../lib/setup.ts](../lib/setup.ts) 一个文件即可,所有示例会自动生效。
