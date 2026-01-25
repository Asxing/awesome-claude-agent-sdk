import { query } from '../lib/setup.js';

// IMPORTANT: You must specify settingSources to load CLAUDE.md
// The claude_code preset alone does NOT load CLAUDE.md files
const messages = [];

for await (const message of query({
    prompt: "Add a new React component for user profiles",
    options: {
        systemPrompt: {
            type: "preset",
            preset: "claude_code", // Use Claude Code's system prompt
        },
        settingSources: ["project"], // Required to load CLAUDE.md from project
    },
})) {
    messages.push(message);
}

// Now Claude has access to your project guidelines from CLAUDE.md