import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Hello Claude",
    options: { maxTurns: 1 }
})) {
    if (message.type === "system" && message.subtype === "init") {
        console.log("Available slash commands:", message.slash_commands);
        // Example output: ["/compact", "/clear", "/help"]
    }
}