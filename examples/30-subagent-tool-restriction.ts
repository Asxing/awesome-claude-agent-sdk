import { query } from "../lib/setup.js";

// Subagent with restricted toolset
for await (const message of query({
    prompt: "Analyze the architecture of this examples codebase",
    options: {
        allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
        agents: {
            'code-analyzer': {
                description: 'Static code analysis and architecture review',
                prompt: `You are a code architecture analyst. Analyze code structure,
identify patterns, and suggest improvements without making changes.`,
                // Read-only tools: no Edit, Write, or Bash access
                tools: ['Read', 'Grep', 'Glob']
            }
        }
    }
})) {
    if ('result' in message) console.log(message.result);
}