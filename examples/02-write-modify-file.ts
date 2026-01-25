import { query } from "../lib/setup.js";

// Agentic loop: streams messages as Claude works
for await (const message of query({
    // prompt: "Review utils.py for bugs that would cause crashes. Fix any issues you find.",
    // prompt: "Add docstrings to all functions in utils.py",
    // prompt: "Add type hints to all functions in utils.py",
    prompt: "Write unit tests for utils.py, run them, and fix any failures",
    options: {
        allowedTools: ["Read", "Edit", "Glob", "WebSearch", "Bash"],  // Tools Claude can use
        permissionMode: "acceptEdits",            // Auto-approve file edits
        systemPrompt: "You are a senior Python developer. Always follow PEP 8 style guidelines."
    }
})) {
    // Print human-readable output
    if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
            if ("text" in block) {
                console.log(block.text);             // Claude's reasoning
            } else if ("name" in block) {
                console.log(`Tool: ${block.name}`);  // Tool being called
            }
        }
    } else if (message.type === "result") {
        console.log(`Done: ${message.subtype}`); // Final result
    }
}
