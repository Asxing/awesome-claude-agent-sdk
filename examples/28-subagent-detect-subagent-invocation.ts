import { query } from "../lib/setup.js";


for await (const message of query({
    prompt: "Use the code-reviewer agent to review utils.py for potential improvements.",
    options: {
        allowedTools: ["Read", "Glob", "Grep", "Task"],
        agents: {
            "code-reviewer": {
                description: "Expert code reviewer.",
                prompt: "Analyze code quality and suggest improvements.",
                tools: ["Read", "Glob", "Grep"]
            }
        }
    }
})) {
    const msg = message as any;

    // Check for subagent invocation in message content
    for (const block of msg.message?.content ?? []) {
        if (block.type === "tool_use" && block.name === "Task") {
            console.log(`Subagent invoked: ${block.input.subagent_type}`);
        }
    }

    // Check if this message is from within a subagent's context
    if (msg.parent_tool_use_id) {
        console.log("Message from subagent:");
        // @ts-ignore
        console.log(message.message.content);
        console.log("  (running inside subagent)");
    }

    if ("result" in message) {
        console.log(message.result);
    }
}