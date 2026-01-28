# awesome-claude-agent-sdk

> A comprehensive collection of examples and tools for building intelligent agents with Claude and the Model Context Protocol (MCP).

[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0-blue)](https://www.typescriptlang.org/)

## 📖 Overview

This repository contains a curated collection of examples, patterns, and utilities for building AI agents using the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk). It demonstrates best practices for integrating Claude with the Model Context Protocol (MCP) to create autonomous, context-aware agents.

### Key Features

- **40+ Production-Ready Examples** — From basic queries to complex multi-agent workflows
- **MCP Integration** — Complete examples of Model Context Protocol integration and custom tool development
- **Advanced Patterns** — Includes approval workflows, session management, cost tracking, and structured output
- **Real-World Use Cases** — Todo tracking, code review, skill-based agents, and more
- **Comprehensive Documentation** — Each example is thoroughly commented and documented

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn** package manager
- **Anthropic API Key** — Get one at [console.anthropic.com](https://console.anthropic.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/asxing/awesome-claude-agent-sdk.git
cd awesome-claude-agent-sdk

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Running Examples

```bash
# Run a specific example
npx tsx examples/01-query-basic-query.ts

# Run with watch mode
npx tsx --watch examples/01-query-basic-query.ts

# Run all examples
npm run example
```

## 📚 Example Categories

### Basics (01-05)
- **01-query-basic-query.ts** — Simple prompt queries with basic tools
- **02-write-modify-file.ts** — Automatic file modification and editing
- **03-input-streaming-input.ts** — Real-time streaming input handling
- **04-input-single-message-input.ts** — Single message input processing
- **05-permission-at-query-time.ts** — Runtime permission checks

### Advanced Permissions (06-08)
- **06-permission-during-streaming.ts** — Permission handling during streaming
- **07-approval-handle-tool-approval-requests.ts** — Tool approval workflows
- **08-approval-handle-clarifying-questions.ts** — Clarification question handling
- **08-hooks-intercept-control-angent-with-hooks.ts** — Intercepting agent control with hooks

### Session & State Management (09-12)
- **09-session-getting-session-id.ts** — Session identification and tracking
- **10-session-forking-a-session.ts** — Creating session branches
- **11-rewind-single-checkpoint.ts** — Single checkpoint restoration
- **12-rewind-multiple-checkpoints.ts** — Multi-checkpoint management

### Structured Output (13-15)
- **13-structured-output-query-company.ts** — Company data extraction
- **14-structured-output-by-zod.ts** — Zod schema-based output validation
- **15-structured-output-todo-tracking.ts** — Todo list structured output

### System Prompts & Customization (16-19)
- **16-system-prompts-claude-md.ts** — Markdown system prompt formatting
- **17-system-prompts-output-styles.ts** — Output style customization
- **18-system-prompts-systemPrompt-append.ts** — System prompt appending
- **19-system-prompts-custom.ts** — Custom system prompt implementation

### MCP Integration (20-22)
- **20-mcp-query-claude-code-docs.ts** — Querying Claude code documentation via MCP
- **21-mcp-load-by-code.ts** — Programmatic MCP server loading
- **22-mcp-load-config-automatic.ts** — Automatic MCP configuration loading

### Custom Tools (23-24)
- **23-custom-tool.ts** — Single custom tool implementation
- **24-custom-tool-multiple.ts** — Multiple custom tools example

### Advanced Features (26-40)
- **26-subagent-programmatic-definition.ts** — Programmatic subagent definition
- **27-subagent-dynamic-agent-configuration.ts** — Dynamic agent configuration
- **28-subagent-detect-subagent-invocation.ts** — Subagent invocation detection
- **29-subagent-resume.ts** — Resuming subagent execution
- **30-subagent-tool-restriction.ts** — Tool restriction for subagents
- **31-slash-command-discover.ts** — Slash command discovery
- **32-slash-command-compact.ts** — Compact slash command handling
- **33-slash-command-clear.ts** — Clearing slash commands
- **34-slash-command-custom-command.ts** — Custom command implementation
- **35-slash-command-custom-arguments.ts** — Custom command arguments
- **36-skill-default-skill.ts** — Default skill implementation
- **37-cost-track.ts** — API cost tracking and analysis
- **38-todo-list-monitor.ts** — Todo list monitoring system
- **39-todo-list-real-time-progress-display.ts** — Real-time progress display
- **40-plugin-load-commands.ts** — Plugin command loading

## 📁 Project Structure

```
.
├── examples/                    # 40+ example scripts
│   ├── 01-query-*.ts
│   ├── 02-write-*.ts
│   └── ...
├── lib/                         # Utility libraries
│   ├── setup.ts                 # Common setup utilities
│   └── utils.ts                 # Helper functions
├── plugins/                     # Plugin implementations
│   └── code-review/            # Code review plugin
├── scripts/                     # Build and utility scripts
│   ├── dereference_schema.ts
│   └── print_zod_schema.ts
├── types/                       # TypeScript type definitions
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [@anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) | ^0.2.17 | Core Claude Agent SDK |
| [@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) | ^0.71.2 | Anthropic API client |
| [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | ^1.25.3 | Model Context Protocol |
| [dotenv](https://www.npmjs.com/package/dotenv) | ^17.2.3 | Environment variable management |
| [zod](https://www.npmjs.com/package/zod) | ^3.x | Schema validation |

## 🔑 Environment Setup

Create a `.env` file in the project root:

```env
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Custom configuration
MODEL=claude-3-5-sonnet-20241022
TIMEOUT=30000
DEBUG=false
```

## 📖 Documentation

Each example includes:
- **Detailed comments** explaining the implementation
- **Usage instructions** in the form of `npx tsx examples/XX-*.ts`
- **Configuration options** for customization
- **Best practices** and patterns

For more information, see the [examples/README.md](./examples/README.md) file.

## 🤖 Key Concepts

### Agents
Autonomous systems that can perceive, reason, and take actions using Claude's capabilities and MCP-provided tools.

### Model Context Protocol (MCP)
A protocol for standardizing how tools and data sources are exposed to AI models. Enables agents to access filesystem, web APIs, and custom tools.

### Sessions
Persistent conversation state allowing agents to maintain context across multiple interactions and support checkpoint/rollback functionality.

### Permissions & Approvals
Fine-grained control over what actions agents can take, with options for automatic approval, user confirmation, or clarifying questions.

### Structured Output
Type-safe output using schemas (JSON Schema or Zod) to ensure agent responses conform to expected formats.

## 🔐 Security Considerations

When deploying agents in production:

1. **API Keys** — Store API keys securely in environment variables, never commit them
2. **Tool Permissions** — Carefully restrict which tools agents can access
3. **File System Access** — Limit filesystem operations to necessary directories
4. **Rate Limiting** — Implement rate limiting on agent queries
5. **Cost Monitoring** — Track and set limits on API costs using the cost tracking examples
6. **Audit Logging** — Log all agent actions for accountability

## 🤝 Contributing

Contributions are welcome! Please feel free to:
- Submit bug reports and feature requests
- Create pull requests with improvements
- Add new example patterns
- Improve documentation

## 📄 License

This project is licensed under the ISC License — see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com/) — For the Claude API and Agent SDK
- [Model Context Protocol](https://modelcontextprotocol.io/) — Protocol design and specification
- Community contributors and feedback

## 🔗 Useful Links

- [Claude API Documentation](https://docs.anthropic.com)
- [Claude Agent SDK Repository](https://github.com/anthropics/claude-agent-sdk)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Anthropic Console](https://console.anthropic.com)

## 📧 Support

For issues, questions, or discussions:
- Open an issue on GitHub
- Check existing examples and documentation
- Refer to the [Anthropic documentation](https://docs.anthropic.com)

---

**Happy building with Claude agents! 🚀**
