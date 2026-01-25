import { query } from "../lib/setup.js";

// Simple one-shot query
// for await (const message of query({
//     prompt: "Explain the authentication flow",
//     options: {
//         allowedTools: ["Read", "Grep"],
//     }
// })) {
//     console.log("Received message:", JSON.stringify(message, null, 2));
//     if ("result" in message) {
//         console.log("Result:", message.result);
//     }
// }

// Continue conversation with session management
for await (const message of query({
    prompt: "Now explain the authorization process,使用中文回答",
    options: {
        continue: true
    }
})) {
    console.log("Received message:", JSON.stringify(message, null, 2));
    if ("result" in message) {
        console.log("result2:");
        console.log(message.result);
    }
}