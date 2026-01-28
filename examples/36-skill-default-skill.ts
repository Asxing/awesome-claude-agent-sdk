import { query } from "../lib/setup.js";

for await (const message of query({
    prompt: "Help me process this claudes-constitution.pdf PDF document",
    options: {
        cwd: process.cwd(),  // Project with .claude/skills/
        settingSources: ["user", "project"],  // Load Skills from filesystem
        allowedTools: ["Skill", "Read", "Write", "Bash"]  // Enable Skill tool
    }
})) {
    console.log(message);
}