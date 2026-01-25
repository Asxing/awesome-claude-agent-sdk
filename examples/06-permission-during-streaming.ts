import { query } from "../lib/setup.js";

async function main() {
    const q = query({
        // prompt: "Help me refactor this code, filename: utils.py",
        prompt: "Help me format this code, filename: utils.py",
        options: {
            permissionMode: "default",  // Start in default mode
        },
    });

    // Change mode dynamically mid-session
    await q.setPermissionMode("acceptEdits");

    // Process messages with the new permission mode
    for await (const message of q) {
        if ("result" in message) {
            console.log(message.result);
        }
    }
}

main();