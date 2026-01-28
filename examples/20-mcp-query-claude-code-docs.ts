import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Use the docs MCP server to explain what hooks are in Claude Code",
    options: {
        mcpServers: {
            "claude-code-docs": {
                type: "http",
                url: "https://code.claude.com/docs/mcp"
            }
        },
        allowedTools: ["mcp__claude-code-docs__*"]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}