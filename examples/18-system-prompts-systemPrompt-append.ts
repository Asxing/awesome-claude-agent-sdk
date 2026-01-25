import { query } from "../lib/setup.js";

const messages = [];

for await (const message of query({
    prompt: "Help me write a Python function to calculate fibonacci numbers",
    options: {
        allowedTools: ['Write'],
        systemPrompt: {
            type: "preset",
            preset: "claude_code",
            append:
                "Always include detailed docstrings and type hints in Python code.",
        },
    },
})) {
    messages.push(message);
    if (message.type === "assistant") {
        console.log(message.message.content);
    }
}