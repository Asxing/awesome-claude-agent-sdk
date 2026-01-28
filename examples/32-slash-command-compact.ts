import { query } from "../lib/setup.js";

let sessionId: string | undefined

const response = query({
    prompt: "Hello Claude",
    options: {
        model: "claude-sonnet-4-5"
    }
})

for await (const message of response) {
    // The first message is a system init message with the session ID
    if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id
        console.log(`Session started with ID: ${sessionId}`)
    }

    // Process other messages...
    console.log(message)
}

// Later, you can use the saved sessionId to resume
if (sessionId) {
    for await (const message of query({
        prompt: "/compact",
        options: { maxTurns: 1, resume: sessionId }
    })) {
        if (message.type === "result") {
            console.log("Command executed:", message);
        }
        if (message.type === "system" && message.subtype === "compact_boundary") {
            console.log("Compaction completed");
            console.log("Pre-compaction tokens:", message.compact_metadata.pre_tokens);
            console.log("Trigger:", message.compact_metadata.trigger);
        }
    }
}