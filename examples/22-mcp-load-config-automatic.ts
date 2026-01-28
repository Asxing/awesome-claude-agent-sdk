import { query } from "../lib/setup.js";

// 注意此时需要调整根目录下.mcp.json中的路径，指向你想要访问的目录
for await (const message of query({
    prompt: "List files in my project",
    options: {
        allowedTools: ["mcp__filesystem__*"]
    }
})) {
    if (message.type === "result" && message.subtype === "success") {
        console.log(message.result);
    }
}