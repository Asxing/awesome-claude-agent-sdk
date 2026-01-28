import { query } from "../lib/setup.js";

// Use a custom command
for await (const message of query({
    prompt: "/refactor utils.py",
    options: { maxTurns: 3, settingSources: ["project"] }
})) {
    if (message.type === "assistant") {
        console.log("Refactoring suggestions:", message.message);
    }
}

// Custom commands appear in the slash_commands list
for await (const message of query({
    prompt: "Hello",
    options: { maxTurns: 1, settingSources: ["project"] }
})) {
    if (message.type === "system" && message.subtype === "init") {
        // Will include both built-in and custom commands
        console.log("Available commands:", message.slash_commands);
        // Example: ["/compact", "/clear", "/help", "/refactor", "/security-check"]
    }
}