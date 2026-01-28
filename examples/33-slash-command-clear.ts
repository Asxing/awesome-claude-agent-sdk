import { query } from "../lib/setup.js";

// Clear conversation and start fresh
for await (const message of query({
    prompt: "/clear",
    options: { maxTurns: 1 }
})) {
    if (message.type === "system" && message.subtype === "init") {
        console.log("Conversation cleared, new session started");
        console.log("Session ID:", message.session_id);
    }
}