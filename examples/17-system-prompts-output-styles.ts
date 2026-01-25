import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

async function createOutputStyle(
    name: string,
    description: string,
    prompt: string
) {
    // User-level: ~/.claude/output-styles
    // Project-level (preferred): <project-root>/.claude/output-styles
    // Use the project root (process.cwd()) so output styles are created at the project level.
    const outputStylesDir = join(process.cwd(), ".claude", "output-styles");

    await mkdir(outputStylesDir, { recursive: true });

    const content = `---
name: ${name}
description: ${description}
---

${prompt}`;

    const filePath = join(
        outputStylesDir,
        `${name.toLowerCase().replace(/\s+/g, "-")}.md`
    );
    await writeFile(filePath, content, "utf-8");
}

// Example: Create a code review specialist
await createOutputStyle(
    "Code Reviewer",
    "Thorough code review assistant",
    `You are an expert code reviewer.

For every code submission:
1. Check for bugs and security issues
2. Evaluate performance
3. Suggest improvements
4. Rate code quality (1-10)`
);