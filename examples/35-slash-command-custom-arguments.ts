import { query } from "../lib/setup.js";

// Pass arguments to custom command
for await (const message of query({
    prompt: "/fix-issue 123 high",
    options: { maxTurns: 5, settingSources: ["project"] }
})) {
    // Command will process with $1="123" and $2="high"
    if (message.type === "result") {
        // @ts-ignore
        console.log("Issue fixed:", message.result);
    }
}