import { type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '../lib/setup.js';

// Helper to extract agentId from message content
// Stringify to avoid traversing different block types (TextBlock, ToolResultBlock, etc.)
function extractAgentId(message: SDKMessage): string | undefined {
    if (!('message' in message)) return undefined;
    // Stringify the content so we can search it without traversing nested blocks
    const content = JSON.stringify(message.message.content);
    const match = content.match(/agentId:\s*([a-f0-9-]+)/);
    return match?.[1];
}

let agentId: string | undefined;
let sessionId: string | undefined;

// First invocation - use the Explore agent to find API endpoints
for await (const message of query({
    prompt: "Use the Explore agent to find all API endpoints in examples folder codebase",
    options: { allowedTools: ['Read', 'Grep', 'Glob', 'Task'] }
})) {
    // Capture session_id from ResultMessage (needed to resume this session)
    if ('session_id' in message) sessionId = message.session_id;
    // Search message content for the agentId (appears in Task tool results)
    const extractedId = extractAgentId(message);
    if (extractedId) agentId = extractedId;
    

    // Check for subagent invocation in message content
    // @ts-ignore
    for (const block of message.message?.content ?? []) {
        if (block.type === "tool_use" && block.name === "Task") {
            console.log(`Subagent invoked: ${block.input.subagent_type}`);
        }
    }

    // Check if this message is from within a subagent's context
    // @ts-ignore
    if (message.parent_tool_use_id) {
        console.log("Message from subagent:");
        // @ts-ignore
        console.log(message.message.content);
        console.log("  (running inside subagent)");
    }

    // Print the final result
    if ('result' in message) console.log(message.result);
}

// Second invocation - resume and ask follow-up
if (agentId && sessionId) {
    for await (const message of query({
        prompt: `Resume agent ${agentId} and list the top 3 most complex endpoints`,
        options: { allowedTools: ['Read', 'Grep', 'Glob', 'Task'], resume: sessionId }
    })) {
        if ('result' in message) console.log(message.result);
    }
}