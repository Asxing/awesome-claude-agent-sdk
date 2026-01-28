import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "List files in my project",
    options: {
        mcpServers: {
            "filesystem": {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()]
            }
        },
        allowedTools: ["mcp__filesystem__*"]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}