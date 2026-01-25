import { query } from "../lib/setup.js";
import * as readline from "readline";

// Helper to prompt user for input in the terminal
function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        })
    );
}

for await (const message of query({
    prompt: "Create a test file in /tmp and then delete it",
    options: {
        canUseTool: async (toolName, input: Record<string, unknown>) => {

            // 使用 approve with changes
            // if (toolName === "Bash") {
            //     // User approved, but scope all commands to sandbox
            //     const sandboxedInput = {
            //         ...input,
            //         command: input.command.replace("/tmp", "/tmp/sandbox")
            //     };
            //     return { behavior: "allow" as const, updatedInput: sandboxedInput };
            // }
            // return { behavior: "allow" as const, updatedInput: input };

            // Display the tool request
            console.log(`\nTool: ${toolName}`);
            if (toolName === "Bash") {
                console.log(`Command: ${input.command}`);
                if (input.description) console.log(`Description: ${input.description}`);
            } else {
                console.log(`Input: ${JSON.stringify(input, null, 2)}`);
            }

            // Get user approval
            const response = await prompt("Allow this action? (y/n): ");

            // Return allow or deny based on user's response
            if (response.toLowerCase() === "y") {
                // Allow: tool executes with the original (or modified) input
                return { behavior: "allow" as const, updatedInput: input };
            } else {
                // Deny: tool doesn't execute, Claude sees the message
                return { behavior: "deny" as const, message: "User denied this action" };
            }


        },
    },
})) {
    if ("result" in message) console.log(message.result);
}