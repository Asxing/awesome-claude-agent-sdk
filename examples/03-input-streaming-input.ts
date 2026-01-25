import { query } from "../lib/setup.js";
import { readFileSync } from "fs";

async function* generateMessages() {
    // First message
    yield {
        type: "user" as const,
        message: {
            role: "user" as const,
            content: "Analyze this codebase for security issues"
        },
        parent_tool_use_id: null,
        session_id: ""
    };

    // Wait for conditions or user input
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Follow-up with image
    yield {
        type: "user" as const,
        message: {
            role: "user" as const,
            content: [
                {
                    type: "text" as const,
                    text: "Review this architecture diagram"
                },
                {
                    type: "image" as const,
                    source: {
                        type: "base64" as const,
                        media_type: "image/png" as const,
                        data: readFileSync("diagram.png", "base64")
                    }
                }
            ]
        },
        parent_tool_use_id: null,
        session_id: ""
    };
}

// Process streaming responses
for await (const message of query({
    prompt: generateMessages(),
    options: {
        maxTurns: 10,
        allowedTools: ["Read", "Grep"]
    }
})) {
    if ("result" in message) {
        console.log(message.result);
    }
}
