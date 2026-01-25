import { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { query } from "../lib/setup.js";

// Define a hook callback with the HookCallback type
// @ts-ignore
const protectEnvFiles: HookCallback = async (input, toolUseID, { signal }) => {
    // Cast input to the specific hook type for type safety
    const preInput = input as PreToolUseHookInput;

    // Extract the file path from the tool's input arguments
    // @ts-ignore
    const filePath = preInput.tool_input?.file_path as string;
    const fileName = filePath?.split('/').pop();

    // Block the operation if targeting a .env file
    if (fileName === '.env') {
        return {
            hookSpecificOutput: {
                hookEventName: input.hook_event_name,
                permissionDecision: 'deny',
                permissionDecisionReason: 'Cannot modify .env files'
            }
        };
    }

    // Return empty object to allow the operation
    return {};
};

for await (const message of query({
    prompt: "Update the MESSAGE_LOGS configuration to false in .env file",
    options: {
        hooks: {
            // Register the hook for PreToolUse events
            // The matcher filters to only Write and Edit tool calls
            PreToolUse: [{ matcher: 'Write|Edit', hooks: [protectEnvFiles] }]
        }
    }
})) {
    console.log(message);
}